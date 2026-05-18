// Animated mesh background — three blurred radial orbs that drift behind
// the app. CSS does all the work via .bg-mesh / .bg-orb in bold-redesign.css.
// Visibility/animation is controlled by html[data-anim] and html[data-bg].
export default function MeshBackground() {
  return (
    <div className="bg-mesh" aria-hidden="true">
      <div className="bg-orb o1" />
      <div className="bg-orb o2" />
      <div className="bg-orb o3" />
    </div>
  );
}
