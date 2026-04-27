import { Outlet } from "react-router-dom";
import TopNav from "../components/ui/TopNav";
import Footer from "../components/ui/Footer";

export default function Layout() {
  return (
    <div className="min-h-screen" style={{ background: "#FAF6F0" }}>
      <TopNav />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
