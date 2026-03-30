import { onMounted, onUnmounted, ref } from 'vue'

export function isThaiChar(char: string): boolean {
  return /[\u0E00-\u0E7F]/.test(char)
}

export function splitToCharSpans(text: string): { char: string, isThai: boolean }[] {
  const segmenter = new Intl.Segmenter('th', { granularity: 'grapheme' })
  return Array.from(segmenter.segment(text)).map(({ segment }) => ({
    char: segment,
    isThai: isThaiChar(segment),
  }))
}

export function useDetectPrint() {
  const isPrinting = ref<boolean>(false)
  const printMq = ref<MediaQueryList | null>(null)

  function mqEvent(mqList: MediaQueryList) {
    isPrinting.value = !!mqList.matches
  }

  onMounted(() => {
    if (typeof window !== 'undefined' && window?.matchMedia) {
      printMq.value = window.matchMedia('print')
      mqEvent(printMq.value)
    }
  })

  return {
    isPrinting,
  }
}

export function usePrint() {
  function print() {
    window.print()
  }
  function openPrint() {
    window.open(window.location.href, '_blank')
  }

  return {
    print,
    openPrint,
  }
}
