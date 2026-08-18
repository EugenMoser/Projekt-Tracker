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
  insideModal: boolean,
) {
  const [overlap, setOverlap] = React.useState(0)
  const keyboardCoordsRef = React.useRef<KeyboardEndCoordinates | null>(null)
  // Height of the wrapper view with no keyboard showing. Only needed by the
  // insideModal branch below, to tell how much the OS already shrank the
  // dialog on its own before we add any padding of our own.
  const baseHeightRef = React.useRef<number | null>(null)

  const remeasure = React.useCallback(() => {
    // Both paths measure now: the non-modal path still needs `y`/`height` in
    // window coordinates, and the insideModal path needs `height` to detect
    // how far Android's own dialog resize already ate into the keyboard
    // overlap (see the doc comment on `insideModal`).
    ref.current?.measureInWindow((_x, y, _width, height) => {
      if (!Number.isFinite(y) || !Number.isFinite(height)) return
      const coords = keyboardCoordsRef.current
      if (!coords) {
        // No keyboard showing: this is the undisturbed height, captured as
        // the baseline the insideModal branch compares against once the
        // keyboard (and possibly the dialog resize) kicks in. Only ever grow
        // it, never shrink it: Android's dialog resize and the
        // keyboardDidShow event come from two different sources (the dialog
        // window vs. the activity root view) with no guaranteed order. If
        // onLayout fires with the already-shrunk height before the keyboard
        // event sets `coords`, this branch would otherwise freeze the
        // shrunk height as the baseline and reintroduce the double-counting
        // this whole path exists to avoid.
        baseHeightRef.current = Math.max(baseHeightRef.current ?? 0, height)
        const next = 0
        setOverlap((prev) => (Math.abs(prev - next) > 1 ? next : prev))
        return
      }
      if (insideModal) {
        // Android's ReactModalHostView.kt puts the dialog window in
        // SOFT_INPUT_ADJUST_RESIZE, so the OS already shrinks this view by
        // (up to) the keyboard height on its own — padding by the full
        // keyboard height on top would double-count and crush the content.
        // iOS's pageSheet/formSheet is never resized, so there `height`
        // stays at the baseline and the full keyboard height is still
        // correct. Subtracting whatever the OS already reclaimed makes both
        // platforms fall out of the same formula without a Platform.OS branch.
        const baseHeight = baseHeightRef.current ?? height
        const alreadyShrunk = Math.max(baseHeight - height, 0)
        const next = Math.max(coords.height - alreadyShrunk, 0)
        setOverlap((prev) => (Math.abs(prev - next) > 1 ? next : prev))
        return
      }
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
   * Set when this view sits inside a RN `<Modal>`. Two platform quirks apply
   * here, both worked around below instead of via a `Platform.OS` branch:
   *
   * 1. Under Fabric, the modal's host view (`ModalHostViewShadowNode`) is
   *    itself a layout root, so `LayoutableShadowNode::getRelativeLayoutMetrics`
   *    stops the ancestor walk there — `measureInWindow`'s `y` below it is
   *    card-relative, not window-relative, and useless for the non-modal
   *    formula. `height` is unaffected (it's the view's own dimension, not
   *    its position), so it stays usable.
   * 2. Android's `ReactModalHostView.kt` puts the dialog window in
   *    `SOFT_INPUT_ADJUST_RESIZE`, so the OS already shrinks the dialog (and
   *    this view) by the keyboard height on its own. iOS's pageSheet/
   *    formSheet is never resized. Padding by the full keyboard height would
   *    double-count on Android and crush the content to nothing.
   *
   * When set, this component measures its own height instead of using `y`,
   * compares it against the height it had with no keyboard showing, and
   * pads only by whatever the OS did *not* already reclaim — which comes out
   * to the full keyboard height on iOS and to (near) zero on Android.
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
      // reports its new height here, not through a keyboard event. This is how the
      // insideModal path learns about Android's dialog resize, too — it has no
      // keyboard event of its own.
      onLayout={remeasure}
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
export function KeyboardAwareScrollView({
  children,
  ...scrollViewProps
}: KeyboardAwareScrollViewProps) {
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
