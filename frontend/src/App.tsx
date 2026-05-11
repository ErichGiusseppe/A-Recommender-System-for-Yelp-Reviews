import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { NeighborhoodProvider } from "./contexts/NeighborhoodContext";
import Layout from "./layouts/Layout";
import Discovery from "./pages/Discovery";
import Search from "./pages/Search";
import Detail from "./pages/Detail";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Register from "./pages/Register";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NeighborhoodProvider>
          <Routes>
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<Layout />}>
              <Route path="/"             element={<Discovery />} />
              <Route path="/search"       element={<Search />} />
              <Route path="/business/:id" element={<Detail />} />
              <Route path="/profile"      element={<Profile />} />
            </Route>
          </Routes>
        </NeighborhoodProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
