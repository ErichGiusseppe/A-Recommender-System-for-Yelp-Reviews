import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { NeighborhoodProvider } from "./contexts/NeighborhoodContext";
import Layout from "./layouts/Layout";
import Discovery from "./pages/Discovery";
import Search from "./pages/Search";
import Detail from "./pages/Detail";
import Explain from "./pages/Explain";
import Profile from "./pages/Profile";
import Login from "./pages/Login";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NeighborhoodProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Layout />}>
              <Route path="/"             element={<Discovery />} />
              <Route path="/search"       element={<Search />} />
              <Route path="/business/:id" element={<Detail />} />
              <Route path="/explain"      element={<Explain />} />
              <Route path="/explain/:id"  element={<Explain />} />
              <Route path="/profile"      element={<Profile />} />
            </Route>
          </Routes>
        </NeighborhoodProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
