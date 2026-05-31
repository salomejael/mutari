import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Profile from './pages/Profile'
import Chat from './pages/Chat'
import Settings from './pages/Settings'
import Likes from './pages/Likes'
import UserProfile from './pages/UserProfile'
import Navbar from './components/Navbar'
import AuthGuard from './components/AuthGuard'

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<AuthGuard><Home /></AuthGuard>} />
        <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
        <Route path="/chat" element={<AuthGuard><Chat /></AuthGuard>} />
        <Route path="/settings" element={<AuthGuard><Settings /></AuthGuard>} />
        <Route path="/likes" element={<AuthGuard><Likes /></AuthGuard>} />
        <Route path="/user/:userId" element={<AuthGuard><UserProfile /></AuthGuard>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
