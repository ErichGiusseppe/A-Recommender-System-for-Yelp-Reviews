import { Outlet } from "react-router-dom";
import TopNav from "../components/ui/TopNav";
import Footer from "../components/ui/Footer";
import NeighborhoodPicker from "../components/NeighborhoodPicker";
import { useNeighborhood } from "../contexts/NeighborhoodContext";

export default function Layout() {
  const { showPicker, closePicker } = useNeighborhood();

  return (
    <div className="min-h-screen" style={{ background: "#FAF6F0" }}>
      <TopNav />
      <main>
        <Outlet />
      </main>
      <Footer />
      {showPicker && <NeighborhoodPicker onClose={closePicker} />}
    </div>
  );
}
