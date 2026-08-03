import React from 'react'
import {
  Keyboard,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type KeyboardEvent,
  type ScrollViewProps,
} from 'react-native'

type KeyboardEndCoordinates = KeyboardEvent['endCoordinates']

/**
 * Replacement for RN's KeyboardAvoidingView, which gets the geometry wrong here.
 *
 * RN measures its own frame relative to the parent but compares it against the
 * screen-absolute keyboard position. Below a stack header — or inside a pageSheet
 * modal — its padding therefore falls short by exactly the distance to the window
 * top, and the keyboard covers the confirm button. Passing keyboardVerticalOffset
 * only patches one of the two platforms, so we do the arithmetic ourselves.
 *
 * Measuring in window coordinates is the same calculation on both platforms, and it
 * is self-correcting: if a device shrinks the window for the keyboard instead of
 * drawing behind it, the measured bottom edge already sits above the keyboard and
 * the overlap comes out as zero.
 */
function useKeyboardOverlap(
  ref: React.RefObject<React.ComponentRef<typeof View> | null>,
  insideModal: boolean
) {
  const [overlap, setOverlap] = React.useState(0)
  const keyboardCoordsRef = React.useRef<KeyboardEndCoordinates | null>(null)

  const remeasure = React.useCallback(() => {
    const coords = keyboardCoordsRef.current
    if (!coords) return
    if (insideModal) {
      // Fabric makes the modal's host view its own layout root, so measuring
      // below it never sees the sheet's screen offset — see the doc comment
      // on `insideModal` for the full story. The keyboard height itself is
      // the overlap here.
      const next = Math.max(coords.height, 0)
      setOverlap((prev) => (Math.abs(prev - next) > 1 ? next : prev))
      return
    }
    ref.current?.measureInWindow((_x, y, _width, height) => {
      if (!Number.isFinite(y) || !Number.isFinite(height)) return
      const next = Math.max(y + height - coords.screenY, 0)
      setOverlap((prev) => (Math.abs(prev - next) > 1 ? next : prev))
    })
  }, [ref, insideModal])

  React.useEffect(() => {
    const handleShow = (event: KeyboardEvent) => {
      // iOS reports screenY === 0 when "Prefer Cross-Fade Transitions" is
      // enabled in Accessibility settings. Computing with that value would
      // turn into paddingBottom = full view height, collapsing the form to
      // nothing — treat it like a hide instead. RN's own KeyboardAvoidingView
      // guards the same case (node_modules/react-native/Libraries/Components/
      // Keyboard/KeyboardAvoidingView.js).
      if (event.endCoordinates.screenY <= 0) {
        keyboardCoordsRef.current = null
        setOverlap(0)
        return
      }
      keyboardCoordsRef.current = event.endCoordinates
      if (event.duration && event.easing) {
        const duration = Math.max(event.duration, 10)
        LayoutAnimation.configureNext({
          duration,
          update: { duration, type: LayoutAnimation.Types[event.easing] ?? 'keyboard' },
        })
      }
      remeasure()
    }
    const handleHide = () => {
      keyboardCoordsRef.current = null
      setOverlap(0)
    }

    // iOS fires the "will" events early enough to animate along with the keyboard;
    // on Android only the "did" events carry usable coordinates.
    const subscriptions =
      Platform.OS === 'ios'
        ? [
            Keyboard.addListener('keyboardWillChangeFrame', handleShow),
            Keyboard.addListener('keyboardWillHide', handleHide),
          ]
        : [
            Keyboard.addListener('keyboardDidShow', handleShow),
            Keyboard.addListener('keyboardDidHide', handleHide),
          ]

    return () => subscriptions.forEach((subscription) => subscription.remove())
  }, [remeasure])

  return { overlap, remeasure }
}

interface KeyboardAwareViewProps {
  children: React.ReactNode
  /**
   * Set when this view sits inside a RN `<Modal>`. Under Fabric, the modal's
   * host view (`ModalHostViewShadowNode`) is itself a layout root, so
   * `LayoutableShadowNode::getRelativeLayoutMetrics` stops the ancestor walk
   * there — `measureInWindow` below it returns card-relative coordinates
   * (`y = 0`, `height` = card height) instead of window coordinates, which is
   * exactly the wrong math this component otherwise avoids. When set, we skip
   * the measurement and use the keyboard height as the overlap directly; that
   * is correct as long as the sheet reaches the bottom of the screen, which
   * pageSheet/formSheet do on the phone and Android modals always do.
   */
  insideModal?: boolean
}

/** Full-height container that keeps its content clear of the software keyboard. */
export function KeyboardAwareView({ children, insideModal = false }: KeyboardAwareViewProps) {
  const ref = React.useRef<React.ComponentRef<typeof View>>(null)
  const { overlap, remeasure } = useKeyboardOverlap(ref, insideModal)

  return (
    <View
      ref={ref}
      // Re-measure when the frame moves: a window that does resize for the keyboard
      // reports its new height here, not through a keyboard event. Not needed for
      // the insideModal path, which never measures the frame.
      onLayout={insideModal ? undefined : remeasure}
      collapsable={false}
      style={[styles.flex, { paddingBottom: overlap }]}
    >
      {children}
    </View>
  )
}

type KeyboardAwareScrollViewProps = ScrollViewProps & {
  children: React.ReactNode
}

/**
 * Scrollable form body. keyboardShouldPersistTaps="handled" is the important part:
 * without it the ScrollView swallows the first tap on the confirm button while the
 * keyboard is open.
 */
export function KeyboardAwareScrollView({ children, ...scrollViewProps }: KeyboardAwareScrollViewProps) {
  return (
    <KeyboardAwareView>
      <ScrollView keyboardShouldPersistTaps="handled" {...scrollViewProps}>
        {children}
      </ScrollView>
    </KeyboardAwareView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
})
