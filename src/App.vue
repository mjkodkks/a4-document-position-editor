<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, toRaw } from 'vue'
import CustomDialog from './components/CustomDialog.vue'

interface Position {
  no: string | number
  name: string
  xMM: number
  yMM: number
}

type PositionList = Position[]

type JoyString = 'left' | 'top' | 'down' | 'right'

interface PreviewImage {
  id: number
  name: string
  url: string
}

// State
const imageUploadRef = ref<HTMLInputElement | null>(null)
const selectedImage = ref<File | null>(null)
const imageList = ref<File[]>([])
const previewUrl = ref<string | null>(null)
const previewUrlList = ref<PreviewImage[]>([])
const selectedPreviewImage = ref<PreviewImage | null>(null)
const positionList = ref<PositionList>([])
const positionListBackup = ref<PositionList>([])
const newPostionListString = ref<string>()
const positionListString = computed(() => {
  if (!positionList.value || positionList.value.length === 0) {
    return ''
  }
  return JSON.stringify(positionList.value, null, 2)
})
const currentPosition = reactive({ x: 0, y: 0 })
const pageRef = ref<HTMLElement | null>(null)
const showTooltip = ref(false)
const tooltipPosition = reactive({ x: 0, y: 0 })

const a4WidthMm = 210
const a4HeightMm = 297
const rangeMinWidth = 0
const rangeMaxWidth = a4WidthMm
const rangeMinHeight = 0
const rangeMaxHeight = a4HeightMm
const rangeStep = 0.5

const fontSize = ref(12)
const isNoBackgroundPrint = ref(false)
const isShowPreviousPosition = ref(true)
const isTextOnly = ref(false)
const isHidenUI = ref(false)
const noBorderBoxPrint = ref(false)
const fontsList = ref<string[]>([
  'Open Sans, sans-serif',
  'Arial, sans-serif',
  'Courier New, sans-serif',
  'Cordia New, sans-serif',
  'Tahoma, sans-serif',
  'Angsana New, sans-serif',
  'system-ui, sans-serif',
])
const selectedFont = ref(fontsList.value[0])
const lineHeight = ref('1')

// Init from URL params, setting options
const urlParams = new URLSearchParams(window.location.search)
const positionListParam = urlParams.get('positions')
const autoPrint = urlParams.get('autoPrint')
const textOnlyParam = urlParams.get('textOnly')
const hiddenUIParam = urlParams.get('hideUI')
const noBorderBoxPrintParam = urlParams.get('noBorderBoxPrint')
const fontSizeParam = urlParams.get('fontSize')
const fontFamilyParam = urlParams.get('fontFamily')
const lineHeightParam = urlParams.get('lineHeight')
if (positionListParam) {
  // base64 decode
  newPostionListString.value = atob(decodeURIComponent(positionListParam))
  confirmNewPostionList()
}

if (autoPrint === '1') {
  onMounted(() => {
    setTimeout(() => {
      window.print()
    }, 1000)
  })
}

if (textOnlyParam === '1') {
  isTextOnly.value = true
  isShowPreviousPosition.value = false
}

if (hiddenUIParam === '1') {
  isHidenUI.value = true
}

if (noBorderBoxPrintParam === '1') {
  noBorderBoxPrint.value = true
}

if (fontSizeParam) {
  const fs = Number.parseInt(fontSizeParam, 10)
  if (!Number.isNaN(fs)) {
    fontSize.value = fs
  }
}

if (fontFamilyParam) {
  selectedFont.value = fontFamilyParam
}

if (lineHeightParam) {
  lineHeight.value = lineHeightParam
}

// Computed
const styleComputed = computed(() => ({
  background: previewUrl.value ? `url(${previewUrl.value}) no-repeat` : '#fff',
  backgroundSize: 'contain',
  fontFamily: selectedFont.value,
  lineHeight: lineHeight.value,
}))

const tooltipPositionStyle = computed(() => ({
  transform: `translate(${tooltipPosition.x}px, ${tooltipPosition.y}px)`,
}))

// Methods
function shareLink() {
  const baseUrl = window.location.origin + window.location.pathname
  // console.log(baseUrl)
  const shareUrl = new URL(baseUrl)
  shareUrl.searchParams.set('autoPrint', '1')
  shareUrl.searchParams.set('textOnly', isTextOnly.value ? '1' : '0')
  shareUrl.searchParams.set('hideUI', '0')
  shareUrl.searchParams.set('noBorderBoxPrint', noBorderBoxPrint.value ? '1' : '0')
  shareUrl.searchParams.set('fontSize', fontSize.value.toString())
  shareUrl.searchParams.set('fontFamily', selectedFont.value)
  shareUrl.searchParams.set('lineHeight', lineHeight.value)
  const positionsBase64 = encodeURIComponent(btoa(positionListString.value || ''))
  shareUrl.searchParams.set('positions', positionsBase64)

  navigator.clipboard.writeText(shareUrl.toString())
  alert('Share link copied to clipboard!')
}
function examplePositionList(): void {
  newPostionListString.value = `[
  {
    "no": 1,
    "name": "Point A",
    "xMM": 5,
    "yMM": 5
  },
  {
    "no": 2,
    "name": "Point B",
    "xMM": 10,
    "yMM": 10
  }
]`
}
async function uploadChange(evt: Event) {
  const el = evt.target as HTMLInputElement | null
  const files = el?.files

  if (!files || files.length === 0) {
    return
  }

  const fileReaderPromises: Promise<PreviewImage>[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const currentIndex = imageList.value.length
    imageList.value.push(file)

    const promise = new Promise<PreviewImage>((resolve) => {
      const reader = new FileReader()
      reader.addEventListener('load', (e) => {
        resolve({
          id: currentIndex,
          name: file.name,
          url: e.target?.result as string,
        })
      })
      reader.readAsDataURL(file)
    })

    fileReaderPromises.push(promise)
  }

  const results = await Promise.all(fileReaderPromises)
  previewUrlList.value.push(...results)

  // Auto-select first image if nothing is selected
  if (!selectedPreviewImage.value && previewUrlList.value.length > 0) {
    selectedImage.value = imageList.value.at(0) || null
    selectedPreviewImage.value = previewUrlList.value.at(0) || null
    previewUrl.value = previewUrlList.value.at(0)?.url || null
  }
}

function selectPreview(id: number) {
  const selected = previewUrlList.value.find(img => img.id === id)
  if (selected) {
    selectedPreviewImage.value = selected
    previewUrl.value = selected.url
  }
}

function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>): void => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

const dialog = ref<InstanceType<typeof CustomDialog>>()

function showDialog(): void {
  if (dialog.value) {
    examplePositionList()
    dialog.value.showDialog()
  }
}

function confirmNewPostionList(option?: { closeDialog?: boolean }): void {
  if (!newPostionListString.value) {
    /* empty */
  }
  const newPostionListJson: PositionList = JSON.parse(
    newPostionListString.value || '',
  )
  if (Array.isArray(newPostionListJson)) {
    const template: PositionList = []
    newPostionListJson.forEach((pos) => {
      template.push({
        no: pos?.no || '',
        name: pos?.name || '',
        xMM: +pos?.xMM || 0,
        yMM: +pos?.yMM || 0,
      })
    })
    positionList.value = template
  }
  newPostionListString.value = ''
  positionListBackup.value = structuredClone(toRaw(positionList.value))
  if (option?.closeDialog && dialog.value) {
    dialog.value.close()
  }
}

const joyClickInterval = ref<number | null>(null)
// const joyHoldDuration = 200
function movePostionJoy(key: JoyString, currentPos: Position): void {
  switch (key) {
    case 'left':
      currentPos.xMM = currentPos.xMM - rangeStep
      break
    case 'top':
      currentPos.yMM = currentPos.yMM - rangeStep
      break
    case 'down':
      currentPos.yMM = currentPos.yMM + rangeStep
      break
    case 'right':
      currentPos.xMM = currentPos.xMM + rangeStep
  }
}

function clearHoldJoy() {
  joyClickInterval.value && clearTimeout(joyClickInterval.value)
}
function reset(): void {
  if (!confirm('Are you sure to reset all?'))
    return
  selectedImage.value = null
  previewUrl.value = null
  selectedPreviewImage.value = null
  imageList.value = []
  previewUrlList.value = []
  if (imageUploadRef.value) {
    imageUploadRef.value.value = ''
  }
  positionList.value = []
  positionListBackup.value = []
  showTooltip.value = false
  newPostionListString.value = ''
}

function resetPositionList(): void {
  positionList.value = structuredClone(
    toRaw(positionListBackup.value),
  )
}

function removePosition(posIndex: number): void {
  if (confirm('Are you sure to remove this position?') === false)
    return
  positionList.value = positionList.value.filter(
    (_, index) => index !== posIndex,
  )
}

function copyPosition(text: string) {
  if (!text) {
    /* empty */
  }
  if (!navigator.clipboard) {
    /* not supported */
  }
  navigator.clipboard.writeText(text)
  alert('copy success!')
}

const onMouseMoveDebounce = debounce(onMouseMovePage, 200)

function onMouseMovePage(evt: MouseEvent): void {
  if (!pageRef.value || !selectedImage.value)
    return
  const { xMM, yMM } = calculatePositionFromEvent(evt) || {
    xMM: 0,
    yMM: 0,
  }
  currentPosition.x = xMM
  currentPosition.y = yMM
}

function onMouseOverPage(): void {
  if (!pageRef.value || !selectedImage.value)
    return
  showTooltip.value = true
}

// click to add position
function onMouseDownPage(evt: MouseEvent): void {
  evt.preventDefault()
  if (!pageRef.value || !selectedImage.value)
    return

  if (evt.button === 2) {
    return
  }

  const posName = prompt('Please enter the position name, or leave blank')
  if (posName === null) {
    return
  }
  const { xMM, yMM } = calculatePositionFromEvent(evt) || {
    xMM: 0,
    yMM: 0,
  }
  positionList.value.push({
    no: positionList.value.length + 1,
    name: posName || '',
    xMM,
    yMM,
  })
}

function onMouseOutPage(evt: MouseEvent): void {
  if ((evt.relatedTarget as HTMLElement)?.className === 'tooltip') {
    return
  }
  showTooltip.value = false
}

function calculatePositionFromEvent(
  evt: MouseEvent,
): { xMM: number, yMM: number } | undefined {
  if (!pageRef.value || !selectedImage.value)
    return
  const pageWidth = pageRef.value.clientWidth
  const pageHeight = pageRef.value.clientHeight
  const rectPage = pageRef.value.getBoundingClientRect()
  const offsetX = evt.clientX - rectPage.left
  const offsetY = evt.clientY - rectPage.top
  // console.log({ offsetX, offsetY, pageWidth, pageHeight, rect })
  const fixedDecimal = 2
  // const xPercent = ((offsetX / pageWidth) * 100).toFixed(fixedDecimal)
  // const yPercent = ((offsetY / pageHeight) * 100).toFixed(fixedDecimal)
  const xMM = +((offsetX / pageWidth) * a4WidthMm).toFixed(fixedDecimal)
  const yMM = +((offsetY / pageHeight) * a4HeightMm).toFixed(fixedDecimal)
  return { xMM, yMM }
}

function calculateTooltipPosition(evt: MouseEvent): { x: number, y: number } {
  if (!pageRef.value || !selectedImage.value)
    return { x: 0, y: 0 }
  const offsetXY = 14
  // print all position event
  const x
    = evt.clientX + (document.scrollingElement?.scrollLeft || 0) + offsetXY
  const y
    = evt.clientY + (document.scrollingElement?.scrollTop || 0) + offsetXY
  return { x, y }
}

// Dragging point logic
const isDraggingPoint = ref<boolean>(false)
const offsetPostion = ref<{ x: number, y: number }>({
  x: 0,
  y: 0,
})
const draggingPosition = ref<Position | null>(null)
const selecteElementPoint = ref<HTMLDivElement | null>(null)

function onMouseDownPoint(evt: MouseEvent, pos: Position): void {
  evt.stopPropagation()
  evt.preventDefault()
  const target = evt.target as HTMLDivElement
  selecteElementPoint.value = target
  isDraggingPoint.value = true
  offsetPostion.value.x = evt.clientX - target.getBoundingClientRect().left
  offsetPostion.value.y = evt.clientY - target.getBoundingClientRect().top
  draggingPosition.value = pos

  // Add global listeners
  document.addEventListener('mousemove', onGlobalMouseMove)
  document.addEventListener('mouseup', onGlobalMouseUp)
}

function onGlobalMouseMove(evt: MouseEvent): void {
  if (!isDraggingPoint.value || !draggingPosition.value)
    return
  if (!pageRef.value || !selectedImage.value)
    return

  evt.preventDefault()
  const { xMM, yMM } = calculatePositionBoxFromEvent(evt) || { xMM: 0, yMM: 0 }
  draggingPosition.value.xMM = xMM
  draggingPosition.value.yMM = yMM
}

function calculatePositionBoxFromEvent(
  evt: MouseEvent,
): { xMM: number, yMM: number } | undefined {
  if (!pageRef.value || !selectedImage.value)
    return
  const pageWidth = pageRef.value.clientWidth
  const pageHeight = pageRef.value.clientHeight
  const rectPage = pageRef.value.getBoundingClientRect()

  const offsetX = evt.clientX - rectPage.left - offsetPostion.value.x
  const offsetY = evt.clientY - rectPage.top - offsetPostion.value.y
  // console.log({ offsetX, offsetY, pageWidth, pageHeight, rect })
  const fixedDecimal = 2
  // const xPercent = ((offsetX / pageWidth) * 100).toFixed(fixedDecimal)
  // const yPercent = ((offsetY / pageHeight) * 100).toFixed(fixedDecimal)
  const xMM = +((offsetX / pageWidth) * a4WidthMm).toFixed(fixedDecimal)
  const yMM = +((offsetY / pageHeight) * a4HeightMm).toFixed(fixedDecimal)
  // console.warn(`Position: ${xMM}mm, ${yMM}mm`)
  return { xMM, yMM }
}

function onGlobalMouseUp(): void {
  isDraggingPoint.value = false
  offsetPostion.value = { x: 0, y: 0 }

  // Clean up global listeners
  document.removeEventListener('mousemove', onGlobalMouseMove)
  document.removeEventListener('mouseup', onGlobalMouseUp)
}

function windowsMouseMove(evt: MouseEvent): void {
  const { x, y } = calculateTooltipPosition(evt)
  tooltipPosition.x = x
  tooltipPosition.y = y
}

onMounted(() => {
  if (pageRef?.value) {
    // for tooltip position
    pageRef.value.addEventListener('mousemove', windowsMouseMove)
  }
})

onUnmounted(() => {
  if (pageRef?.value) {
    // for tooltip position
    pageRef.value.removeEventListener('mousemove', windowsMouseMove)
  }
})
</script>

<template>
  <div class="app">
    <h1 class="title noprint">
      <span>A4</span> Document Position Editor.
    </h1>
    <div v-if="!isHidenUI" class="noprint">
      <ol>
        <li>Upload A4 image (.png, .jpg).</li>
        <li>Upload Position or create new by click on image.</li>
        <li>Drag to move point.</li>
        <li>or Use joystick or input to adjust position.</li>
        <li>Copy JSON position list.</li>
      </ol>
    </div>
    <div v-if="!isHidenUI" class="action-wrapper noprint">
      <div class="fileupload-wrapper noprint">
        <input
          id="image_uploads"
          ref="imageUploadRef"
          type="file"
          name="image_uploads"
          class="input-upload"
          accept="image/*"
          multiple
          @change="uploadChange"
        >
        <button v-if="selectedImage" class="button reset-btn" @click="reset">
          RESET
        </button>
      </div>
      <div v-if="previewUrlList.length > 0" class="image-upload-card-wrapper noprint">
        <div v-for="(image) in previewUrlList" :key="image.id" class="image-upload-card">
          <div class="file-name-card" :title="image.name">
            {{ image.name }}
          </div>
          <img
            :key="`preview_${image.id}`"
            :title="image.name" :src="image.url"
            :alt="`preview_${image.id}`" style="max-height: 150px;"
            class="cursor-pointer"
            :class="[selectedPreviewImage?.id === image.id ? 'selected' : '']"
            @click="selectPreview(image.id)"
          >
        </div>
      </div>
    </div>
    <div class="main" :class="[isHidenUI ? 'hide-ui' : '']">
      <div
        ref="pageRef"
        class="page a4"
        :class="[isNoBackgroundPrint ? 'no-print-background' : '']"
        :style="styleComputed"
        @mousemove="onMouseMoveDebounce"
        @mousedown="onMouseDownPage"
        @mouseout="onMouseOutPage"
        @mouseover="onMouseOverPage"
        @contextmenu.prevent
      >
        <template v-if="isShowPreviousPosition">
          <div
            v-for="pos in positionListBackup"
            :key="pos.no"
            class="point backup noprint"
            :style="{ left: `${pos.xMM}mm`, top: `${pos.yMM}mm`, fontSize: `${fontSize}px` }"
          >
            {{ pos.no }}) {{ pos?.name }}
          </div>
        </template>
        <div
          v-for="pos in positionList"
          :key="pos.no"
          class="point"
          :style="{ left: `${pos.xMM}mm`, top: `${pos.yMM}mm`, fontSize: `${fontSize}px`, border: noBorderBoxPrint ? 'none' : '' }"
          :class="[isDraggingPoint && draggingPosition?.no === pos.no ? 'is-draging' : '',
                   isTextOnly ? 'text-only' : '',
          ]"
          :title="`(${pos.xMM}mm, ${pos.yMM}mm)`"
          @mousedown="onMouseDownPoint($event, pos)"
        >
          {{ pos.no }}) {{ pos?.name }}
        </div>
      </div>
      <div v-show="showTooltip" class="tooltip" :style="tooltipPositionStyle">
        ({{ currentPosition.x }}mm, {{ currentPosition.y }}mm)
      </div>
      <div v-if="!isHidenUI" class="card-wrapper noprint">
        <div class="label-wrapper">
          <div class="label noprint">
            POSITION LIST
          </div>
          <button class="button" :disabled="!selectedImage" @click="showDialog">
            IMPORT POSITIONS
          </button>
          <button class="button reset-label-btn" :disabled="positionList.length <= 0" @click="resetPositionList">
            RESET POSITION LIST
          </button>
        </div>
        <div class="card-header">
          <div>No</div>
          <div>Name</div>
          <div>X(mm)</div>
          <div>Y(mm)</div>
          <div>Joypad</div>
          <div />
        </div>
        <div class="card-list">
          <div
            v-for="(card, cardIndex) in positionList"
            :key="card.no"
            class="card"
          >
            <div class="card-no">
              {{ card.no }}
            </div>
            <div class="card-name">
              <input v-model="card.name" type="text">
            </div>
            <div class="card-input">
              <input
                v-model="card.xMM"
                type="number"
                :min="rangeMinWidth"
                :max="rangeMaxWidth"
                :step="rangeStep"
              >
              <input
                v-model="card.xMM"
                type="range"
                :min="rangeMinWidth"
                :max="rangeMaxWidth"
                :step="rangeStep"
              >
            </div>
            <div class="card-input">
              <input
                v-model="card.yMM"
                type="number"
                :min="rangeMinHeight"
                :max="rangeMaxHeight"
                :step="rangeStep"
              >
              <input
                v-model="card.yMM"
                type="range"
                :min="rangeMinHeight"
                :max="rangeMaxHeight"
                :step="rangeStep"
              >
            </div>
            <div class="joystick">
              <button
                @mousedown="movePostionJoy('left', card)"
                @mouseup="clearHoldJoy"
                @mouseout="clearHoldJoy"
              >
                <svg
                  name="arrow-left"
                  role="button"
                  style="transform: rotate(270deg)"
                  xmlns="http://www.w3.org/2000/svg"
                  width="1em"
                  height="1em"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="currentColor"
                    d="M3 19h18a1.002 1.002 0 0 0 .823-1.569l-9-13c-.373-.539-1.271-.539-1.645 0l-9 13A.999.999 0 0 0 3 19"
                  />
                </svg>
              </button>
              <div class="middle">
                <button
                  @mousedown="movePostionJoy('top', card)"
                  @mouseup="clearHoldJoy"
                  @mouseout="clearHoldJoy"
                >
                  <svg
                    name="arrow-top"
                    role="button"
                    xmlns="http://www.w3.org/2000/svg"
                    width="1em"
                    height="1em"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="currentColor"
                      d="M3 19h18a1.002 1.002 0 0 0 .823-1.569l-9-13c-.373-.539-1.271-.539-1.645 0l-9 13A.999.999 0 0 0 3 19"
                    />
                  </svg>
                </button>
                <div class="ball" />
                <button
                  @mousedown="movePostionJoy('down', card)"
                  @mouseup="clearHoldJoy"
                  @mouseout="clearHoldJoy"
                >
                  <svg
                    name="arrow-down"
                    role="button"
                    style="transform: rotate(180deg)"
                    xmlns="http://www.w3.org/2000/svg"
                    width="1em"
                    height="1em"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="currentColor"
                      d="M3 19h18a1.002 1.002 0 0 0 .823-1.569l-9-13c-.373-.539-1.271-.539-1.645 0l-9 13A.999.999 0 0 0 3 19"
                    />
                  </svg>
                </button>
              </div>
              <button
                @mousedown="movePostionJoy('right', card)"
                @mouseup="clearHoldJoy"
                @mouseout="clearHoldJoy"
              >
                <svg
                  name="arrow-right"
                  role="button"
                  style="transform: rotate(90deg)"
                  xmlns="http://www.w3.org/2000/svg"
                  width="1em"
                  height="1em"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="currentColor"
                    d="M3 19h18a1.002 1.002 0 0 0 .823-1.569l-9-13c-.373-.539-1.271-.539-1.645 0l-9 13A.999.999 0 0 0 3 19"
                  />
                </svg>
              </button>
            </div>
            <button
              class="card-remove button"
              @click="removePosition(cardIndex)"
            >
              X
            </button>
          </div>
        </div>
        <div class="noprint">
          <div class="card-config-wrapper">
            <div class="font-family-wrapper">
              <div>Font:</div>
              <div>
                <select id="font-size-select" v-model="selectedFont" class="select" name="font-size-select">
                  <option v-for="font in fontsList" :key="font" :value="font">
                    {{ font }}
                  </option>
                </select>
              </div>
            </div>
            <div class="font-lineheight-wrapper">
              <div>Line Height: </div>
              <div><input v-model="lineHeight" type="text" step="0.5"></div>
            </div>
            <div class="font-resize-wrapper ">
              <div>
                Font Size (px):
              </div>
              <div class="font-resize-input">
                <input
                  v-model="fontSize"
                  type="number"
                  :min="0"
                  :max="100"
                  :step="1"
                >
                <input
                  v-model="fontSize"
                  type="range"
                  :min="0"
                  :max="100"
                  :step="1"
                >
              </div>
              <button class="button" @click="fontSize = 12">
                <!-- svg icon revert -->
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><path fill="currentColor" fill-rule="evenodd" d="M6.545.998a1 1 0 0 0 0 2h2.728a2.638 2.638 0 0 1 0 5.275H4.817V6.545a1 1 0 0 0-1.707-.707L.384 8.564a1 1 0 0 0-.22 1.09q.073.18.218.327l2.728 2.728a1 1 0 0 0 1.707-.707v-1.729h4.456a4.638 4.638 0 1 0 0-9.275z" clip-rule="evenodd" /></svg>
              </button>
            </div>
          </div>
          <div class="card-config-wrapper">
            <div class="checkbox-config-wrapper">
              <input id="no-background-checkbox" v-model="isNoBackgroundPrint" type="checkbox" name="no-background-checkbox">
              <label for="no-background-checkbox">Print without background</label>
            </div>
            <div class="checkbox-config-wrapper">
              <input id="show-previous-position-checkbox" v-model="isShowPreviousPosition" type="checkbox" name="no-background-checkbox">
              <label for="show-previous-position-checkbox">Show Previous Postion</label>
            </div>
            <div class="checkbox-config-wrapper">
              <input id="show-no-border-checkbox" v-model="noBorderBoxPrint" type="checkbox" name="no-background-checkbox">
              <label for="show-no-border-checkbox">No Border Box</label>
            </div>
            <div class="checkbox-config-wrapper">
              <input id="show-text-only-checkbox-checkbox" v-model="isTextOnly" type="checkbox" name="text-only-checkbox">
              <label for="show-text-only-checkbox-checkbox">Text Only</label>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="!isHidenUI">
      <div class="label-wrapper noprint">
        <div class="label">
          <div>JSON</div>
        </div>
        <button
          class="button icon"
          :disabled="!positionListString"
          @click="copyPosition(positionListString)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              fill-rule="evenodd"
              d="M3 3a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H5v12a1 1 0 1 1-2 0zm4 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v12a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3z"
              clip-rule="evenodd"
            />
          </svg>
          Copy
        </button>
        <button class="button icon" @click="shareLink">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"><path fill="currentColor" d="M10.25 3a.75.75 0 0 1 0 1.5h-3.5A2.25 2.25 0 0 0 4.5 6.75v10.5l.012.23A2.25 2.25 0 0 0 6.75 19.5h10.5a2.25 2.25 0 0 0 2.25-2.25v-2a.75.75 0 0 1 1.5 0v2A3.75 3.75 0 0 1 17.25 21H6.75a3.75 3.75 0 0 1-3.745-3.557L3 17.25V6.75A3.75 3.75 0 0 1 6.75 3zm4.687-.932a.75.75 0 0 1 .801.113l7 6a.75.75 0 0 1 .032 1.109l-7 6.75a.75.75 0 0 1-1.27-.54v-2.976c-1.014.064-1.97.273-2.94.769c-1.136.581-2.344 1.581-3.689 3.303l-.271.354a.75.75 0 0 1-1.35-.45c0-2.857.687-5.59 2.168-7.628c1.376-1.893 3.41-3.147 6.082-3.344V2.75l.008-.109a.75.75 0 0 1 .429-.573" /></svg>
          Share Link
        </button>
      </div>
      <textarea
        id="json-list"
        v-model="positionListString"
        name="json-list"
        cols="30"
        rows="10"
        class="noprint"
        style="width: 100%"
      />
    </div>
    <CustomDialog
      ref="dialog"
      :is-confirm-auto-close="false"
      @confirm="confirmNewPostionList({ closeDialog: true })"
    >
      <div class="label-wrapper">
        <div class="label noprint">
          Position list in JSON
        </div>
        <button
          type="button"
          class="button icon noprint"
          @click="examplePositionList"
        >
          Example JSON
        </button>
      </div>
      <textarea
        id="newPostionList"
        v-model="newPostionListString"
        name="newPostionList"
        cols="100"
        rows="20"
        class="noprint"
        style="width: 100%"
        placeholder="
        Example: [{
          no: 1,
          name: 'Point A',
          xMM: 10.5,
          yMM: 20.5
        }]"
      />
    </CustomDialog>
  </div>
</template>

<style scoped>
.main {
  display: grid;
  grid-template-columns: 3fr 2fr;
  grid-template-rows: 1fr;
  background: transparent;
  padding: 1rem;

  &.hide-ui {
    grid-template-columns: 1fr
  }
}

.title {
  text-align: center;
  margin-top: 1rem;

  & span {
    font-weight: bold;
    color: var(--primary-color);
  }
}

.label-wrapper {
  display: flex;
  gap: 1rem;
}

.label {
  width: fit-content;
  background-color: black;
  color: white;
  padding: 0 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 0.5rem 0.5rem 0 0;
  align-content: center;
  height: 32px;
}

.btn-copy {
}

.tooltip {
  width: 160px;
  background-color: #000000a6;
  color: #fff;
  text-align: center;
  padding: 5px 4px;
  border-radius: 6px;
  min-height: 24px;
  position: absolute;
  left: 0;
  top: 0;
  transition: all 0.2s;
  z-index: 2;
}

.fileupload-wrapper {
  display: flex;
  justify-content: center;
}

.action-wrapper {
  display: flex;
  gap: 1rem;
  justify-content: center;
  min-height: 1.25rem;
  align-items: center;
  border: solid 1px;
  margin: 1rem auto;
  border-style: dashed;
  flex-direction: column;
  padding: 1rem;
}

.image-upload-card-wrapper {
  display: flex;
  align-items: center;
  overflow-x: auto;
  gap: 16px;
  padding: 4px;
  transition: all 0.3s;

  & .image-upload-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
  }

  & .file-name-card {
    font-size: 0.75rem;
    text-align: center;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  & :hover img {
    transform: scale(1.01);
    transition: all 0.3s;
    outline: solid 2px var(--primary-color);
    border-radius: 4px;
  }

  & img {
    outline: solid 0.5px var(--primary-color);
  }

  & .selected {
    outline: solid 2px var(--primary-color);
    border-radius: 0.5rem;
    transition: all 0.3s;
    border-radius: 4px;
  }
}

.reset-label-btn {
  display: flex;
}

.point {
  min-width: 20px;
  padding: 2px;
  height: auto;
  font-size: 0.75rem;
  text-align: center;
  background: red;
  position: absolute;
  color: #fff;
  border-radius: 0.2rem;
  cursor: grab;
  z-index: 1;
}

.point.backup {
  background: #e4e4e4a3;
  z-index: 0;
  color: #7e7e7e;
    cursor: auto;
}

.card-wrapper {
  --w-col1: 60px;
  --w-col2: 1fr;
  --w-col3: 60px;
  --w-col4: 60px;
  --w-col5: 60px;
  --w-col6: 60px;
  --w-max-width: 100%;
  --row-gap: 0.5rem;
  padding-right: 0.5rem;

  & .card-header {
    display: grid;
    grid-template-columns:
      var(--w-col1) var(--w-col2) var(--w-col3) var(--w-col4)
      var(--w-col5) var(--w-col6);
    grid-template-rows: 1fr;
    justify-content: center;
    text-align: center;
    background: var(--primary-color);
    font-size: 1rem;
    height: 40px;
    max-width: var(--w-max-width);
    gap: var(--row-gap);
    color: white;
    text-transform: capitalize;

    & div {
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }

  & .card-list {
    --height: 46px;
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    overflow: auto;
    resize: vertical;
    padding: 0.5rem 0;
    max-width: var(--w-max-width);
    background: var(--bg-tool-color);
    height: 60dvh;
    width: var(--w-max-width);
    border-radius: 0 0 0.5rem 0.5rem;
    /* box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.5); */

    & .card {
      min-height: var(--height);
      display: grid;
      grid-template-columns:
        var(--w-col1) var(--w-col2) var(--w-col3) var(--w-col4)
        var(--w-col5) var(--w-col6);
      grid-template-rows: 1fr;
      gap: var(--row-gap);
      justify-content: center;
      align-items: flex-start;
    }

    & .card-no {
      text-align: center;
    }

    & .card-name {
      & input {
        width: 100%;
      }
    }

    & .card-input {
      display: flex;
      flex-direction: column;
    }

    & .card-remove {
      width: 40px;
      cursor: pointer;
    }
  }
}

.joystick {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr;
  align-items: center;
  align-self: center;
  justify-items: center;

  & svg {
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      color: red;
    }
  }

  & .middle {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  & .ball {
    height: 8px;
    width: 8px;
    background-color: #fff;
    border-radius: 50%;
  }
}

.is-draging {
  background-color: blue !important;
  cursor: grabbing;
}

.card-config-wrapper {
  margin-top: 1rem;
  background: var(--bg-tool-color);
  padding: 1rem;
  border-radius: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.font-resize-wrapper {
  display: flex;
  gap: 1rem;
  align-items: center;

  & .font-resize-input {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
}

.font-family-wrapper {
  display: flex;
  gap: 1rem;
  align-items: center;

  & .select {
    width: 200px;
  }
}

.font-lineheight-wrapper {
  display: flex;
  gap: 1rem;
  align-items: center;

  & input[type="number"] {
    width: 100px;
  }
}

.print-no-background {
  display: flex;
  gap: 1rem;
  align-items: center;

  & input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }
}

.checkbox-config-wrapper {
  display: flex;
  gap: 1rem;
  align-items: center;

    & input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }
}

.text-only {
  background-color: transparent !important;
  color: black !important;
  border: solid 1px;
  text-shadow: none !important;
  padding: 0 !important;
}

@media screen and (max-width: 1200px) {
  .main {
    grid-template-columns: 1fr;
    grid-template-rows: 2fr;
  }
}
</style>
