import { useEffect } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

/**
 * Hook to enable keyboard navigation in forms:
 * - Down Arrow: Move to next input field
 * - Up Arrow: Move to previous input field
 * - When field has value, typing selects all text (rename style)
 */
export const useFormNavigation = (containerRef: React.RefObject<HTMLElement | null>) => {
  const container = containerRef.current

  // Use react-hotkeys-hook for arrow key navigation (cleaner and more consistent)
  // This provides better integration with React and the existing shortcut system
  useHotkeys(
    'arrowdown',
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (!container || !isFormField(target)) return
      if (e.shiftKey || e.ctrlKey || e.metaKey) return
      
      // Check if target is within our container
      if (!container.contains(target)) return
      
      e.preventDefault()
      moveToNextField(target, container)
    },
    {
      enableOnFormTags: ['input', 'textarea', 'select'],
      preventDefault: true,
    },
    [container]
  )

  useHotkeys(
    'arrowup',
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (!container || !isFormField(target)) return
      if (e.shiftKey || e.ctrlKey || e.metaKey) return
      
      // Check if target is within our container
      if (!container.contains(target)) return
      
      e.preventDefault()
      moveToPreviousField(target, container)
    },
    {
      enableOnFormTags: ['input', 'textarea', 'select'],
      preventDefault: true,
    },
    [container]
  )

  // Handle rename-style behavior (typing in filled field)
  useEffect(() => {
    if (!container) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      
      if (!isFormField(target)) return

      // Handle typing in filled field - select all text (rename style)
      // This happens on keydown before the character is inserted
      if (
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        e.key.length === 1 && // Single character key (not special keys)
        !e.shiftKey &&
        !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Tab', 'Enter'].includes(e.key)
      ) {
        const input = target as HTMLInputElement | HTMLTextAreaElement
        const hasValue = input.value && input.value.length > 0
        const selectionStart = input.selectionStart ?? 0
        const selectionEnd = input.selectionEnd ?? 0
        const isAllSelected = selectionStart === 0 && selectionEnd === input.value.length
        const isCursorAtEnd = selectionStart === selectionEnd && selectionStart === input.value.length
        const isCursorAtStart = selectionStart === selectionEnd && selectionStart === 0
        const isCursorInMiddle = selectionStart === selectionEnd && 
                                  selectionStart > 0 && 
                                  selectionStart < input.value.length
        
        // If field has value and cursor is at start or end (not in middle), select all on first keypress
        // This mimics the "rename" behavior in file explorers
        if (hasValue && !isAllSelected && !isCursorInMiddle && (isCursorAtEnd || isCursorAtStart)) {
          // Prevent default to stop the character from being inserted
          e.preventDefault()
          // Select all text
          input.select()
          // Insert the character at the start (replacing selected text)
          const newValue = e.key + input.value.slice(selectionEnd)
          input.value = newValue
          // Set cursor position after the inserted character
          input.setSelectionRange(1, 1)
          // Trigger input event for Formik
          const inputEvent = new Event('input', { bubbles: true })
          input.dispatchEvent(inputEvent)
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [container])
}

/**
 * Check if element is a form field (excludes buttons)
 */
const isFormField = (element: HTMLElement | null): boolean => {
  if (!element) return false
  
  // Exclude buttons
  if (element.tagName === 'BUTTON') return false
  if (element.tagName === 'INPUT') {
    const inputType = (element as HTMLInputElement).type
    // Exclude button-type inputs
    if (inputType === 'button' || inputType === 'submit' || inputType === 'reset') return false
  }
  
  // Only include actual form input fields
  return element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT'
}

/**
 * Move focus to the next input field
 */
const moveToNextField = (currentField: HTMLElement, container: HTMLElement) => {
  const focusableElements = getFocusableElements(container)
  const currentIndex = focusableElements.indexOf(currentField)

  if (currentIndex < focusableElements.length - 1) {
    const nextField = focusableElements[currentIndex + 1]
    nextField.focus()
    
    // Select all text if field has value
    if (
      (nextField.tagName === 'INPUT' || nextField.tagName === 'TEXTAREA') &&
      (nextField as HTMLInputElement | HTMLTextAreaElement).value
    ) {
      (nextField as HTMLInputElement | HTMLTextAreaElement).select()
    }
  }
}

/**
 * Move focus to the previous input field
 */
const moveToPreviousField = (currentField: HTMLElement, container: HTMLElement) => {
  const focusableElements = getFocusableElements(container)
  const currentIndex = focusableElements.indexOf(currentField)

  if (currentIndex > 0) {
    const prevField = focusableElements[currentIndex - 1]
    prevField.focus()
    
    // Select all text if field has value
    if (
      (prevField.tagName === 'INPUT' || prevField.tagName === 'TEXTAREA') &&
      (prevField as HTMLInputElement | HTMLTextAreaElement).value
    ) {
      (prevField as HTMLInputElement | HTMLTextAreaElement).select()
    }
  }
}

/**
 * Get all focusable form input elements in order (excludes buttons)
 */
const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const selectors = [
    'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([disabled]):not([readonly])',
    'textarea:not([disabled]):not([readonly])',
    'select:not([disabled])',
    // Exclude buttons and button-like elements
  ]

  const elements: HTMLElement[] = []
  
  selectors.forEach((selector) => {
    const found = container.querySelectorAll<HTMLElement>(selector)
    found.forEach((el) => {
      // Exclude buttons explicitly
      if (el.tagName === 'BUTTON') return
      if (el.tagName === 'INPUT') {
        const inputType = (el as HTMLInputElement).type
        if (inputType === 'button' || inputType === 'submit' || inputType === 'reset') return
      }
      
      // Check if element is visible
      const style = window.getComputedStyle(el)
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        elements.push(el)
      }
    })
  })

  // Sort by tab order and DOM position
  return elements.sort((a, b) => {
    const aTabIndex = a.tabIndex || 0
    const bTabIndex = b.tabIndex || 0
    
    if (aTabIndex !== bTabIndex) {
      return aTabIndex - bTabIndex
    }
    
    // If same tabIndex, sort by DOM position
    const position = a.compareDocumentPosition(b)
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
      return -1
    }
    if (position & Node.DOCUMENT_POSITION_PRECEDING) {
      return 1
    }
    return 0
  })
}

