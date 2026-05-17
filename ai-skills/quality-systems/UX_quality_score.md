# UX Quality Score: Haptic Checklists & Spring Animation Matrices

This document defines the mathematical scoring matrices, interactive micro-animations checklists, and dynamic haptic feedback benchmarks used to audit visual UX polish inside the App Factory workspace.

---

## 1. UX Polish Quality Formula

Every newly generated interface must compute its **UX Polish Score (UXPS)** prior to commit:

$$\text{UXPS} = 100 - (\text{Rigid Transitions} \times 15) - (\text{Missing Haptics} \times 10) - (\text{Static skeletons} \times 15)$$

*   **UXPS >= 90**: Approved. Layout meets premium product standards.
*   **UXPS < 90**: Failed. System requires motion refactoring.

---

## 2. Interactive Polish Grid

The review agent must verify the presence of premium interactions:

| Visual UX Check | Target Standard | Penalty Value | Corrective Action |
| :--- | :--- | :--- | :--- |
| **Motion Physics** | Spatial shifts execute via Reanimated spring values. | -15 per rigid change | Wrap transitions in withSpring setups. |
| **Haptic Triggers** | Selections and success alerts fire physical haptic feedback. | -10 if missing | Mount Haptics.selectionAsync() on interactions. |
| **Skeleton Bones** | Dynamic loading screens mount pulsing skeleton bones. | -15 if static loading | Scaffold animated loading skeletons. |
| **Color Transitions** | Theme swaps interpolate colors smoothly using useColors. | -10 if jarring pop | Enforce dynamic styling sheets imports. |

---

## 3. High-Converting Paywall Polish

*   **Decoy Pricing Displays**: High-converting paywalls must renderMonthly, Yearly, and Lifetime options side-by-side.
*   **Active Loss-Aversion**: Pricing cards must highlight yearly savings to drive premium tier upgrades.

---

# Anti-Patterns to Avoid

*   **Over-Animating Views**: Injecting loops of persistent, high-frequency animations across a single screen.
    *   *Consequence*: Clutters visual layout, distracts user focus, and degrades device rendering.
*   **Concealing Cancel Methods**: Hiding legal cancel policies or pricing terms in settings screens.
    *   *Consequence*: Violates App Store guidelines, leading to store review rejections and user chargeback spikes.
