import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./layouts/Layout";
import Discovery from "./pages/Discovery";
import Search from "./pages/Search";
import Detail from "./pages/Detail";
import Explain from "./pages/Explain";
import Profile from "./pages/Profile";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Discovery />} />
          <Route path="/search" element={<Search />} />
          <Route path="/business/:id" element={<Detail />} />
          <Route path="/explain" element={<Explain />} />
          <Route path="/explain/:id" element={<Explain />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
