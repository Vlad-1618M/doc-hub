import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Dashboard } from './pages/Dashboard'
import { ResumeList } from './pages/ResumeList'
import { ResumeDetail } from './pages/ResumeDetail'
import { AddResume } from './pages/AddResume'
import { AddRecord } from './pages/AddRecord'
import { ApiKeys } from './pages/ApiKeys'
import { UbuntuReleaseList } from './pages/UbuntuReleaseList'
import { UbuntuReleaseDetail } from './pages/UbuntuReleaseDetail'
import { PythonReleaseList } from './pages/PythonReleaseList'
import { PythonReleaseDetail } from './pages/PythonReleaseDetail'
import { RomanLeaderList } from './pages/RomanLeaderList'
import { RomanLeaderDetail } from './pages/RomanLeaderDetail'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="resumes" element={<ResumeList />} />
          <Route path="resumes/new" element={<AddResume />} />
          <Route path="resumes/:id" element={<ResumeDetail />} />
          <Route path="ubuntu-releases" element={<UbuntuReleaseList />} />
          <Route path="ubuntu-releases/new" element={<AddRecord schemaId="ubuntu_releases" />} />
          <Route path="ubuntu-releases/:id" element={<UbuntuReleaseDetail />} />
          <Route path="python-releases" element={<PythonReleaseList />} />
          <Route path="python-releases/new" element={<AddRecord schemaId="python_releases" />} />
          <Route path="python-releases/:id" element={<PythonReleaseDetail />} />
          <Route path="roman-leaders" element={<RomanLeaderList />} />
          <Route path="roman-leaders/new" element={<AddRecord schemaId="roman_leaders" />} />
          <Route path="roman-leaders/:id" element={<RomanLeaderDetail />} />
          <Route path="api-keys" element={<ApiKeys />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </AuthProvider>
    </ThemeProvider>
  )
}
