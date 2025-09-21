import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Overview from './pages/Overview'
import Home from './pages/Home'
import Heating from './pages/Heating'
import Electric from './pages/Electric'
import Settings from './pages/Settings'
import TestPage from './pages/TestPage'
import Trends from './pages/Trends'
import AuthManager from './components/AuthManager'
import { initializeAutoSocket } from './helpers/socketHelper'
import { useUserSettings } from './helpers/userSettings'

// Wrapper component for Home page with view toggle state management
function HomeWrapper() {
  const { settings, updateSetting } = useUserSettings();

  return (
    <Layout 
      maxWidth={false}
      hideHeatingPipes={settings.hideHeatingPipes}
      onHideHeatingPipesChange={(hide) => updateSetting('hideHeatingPipes', hide)}
      hideLEDStrips={settings.hideLEDStrips}
      onHideLEDStripsChange={(hide) => updateSetting('hideLEDStrips', hide)}
      hideLamps={settings.hideLamps}
      onHideLampsChange={(hide) => updateSetting('hideLamps', hide)}
      hideTemperatureIcons={settings.hideTemperatureIcons}
      onHideTemperatureIconsChange={(hide) => updateSetting('hideTemperatureIcons', hide)}
      hideWallLights={settings.hideWallLights}
      onHideWallLightsChange={(hide) => updateSetting('hideWallLights', hide)}
      hideHeatPumps={settings.hideHeatPumps}
      onHideHeatPumpsChange={(hide) => updateSetting('hideHeatPumps', hide)}
    >
      <Home 
        hideHeatingPipes={settings.hideHeatingPipes}
        hideLEDStrips={settings.hideLEDStrips}
        hideLamps={settings.hideLamps}
        hideTemperatureIcons={settings.hideTemperatureIcons}
        hideWallLights={settings.hideWallLights}
        hideHeatPumps={settings.hideHeatPumps}
      />
    </Layout>
  );
}

function App() {
  // Automaattinen socket ja auth initialisointi
  useEffect(() => {
    //console.log('🚀 App starting - initializing auto socket...');
    initializeAutoSocket();
  }, []); // Vain kerran kun app latautuu

  return (
    <Router>
      {/* Global authentication manager */}
      <AuthManager />
      
      <Routes>
        <Route path="/" element={<HomeWrapper />} />
        <Route path="/trends" element={<Layout maxWidth={false}><Trends /></Layout>} />
        <Route path="/overview" element={<Layout><Overview /></Layout>} /> 
        <Route path="/lighting" element={<HomeWrapper />} /> {/* Redirect for backward compatibility */}
        <Route path="/heating" element={<Layout><Heating /></Layout>} />
        <Route path="/electric" element={<Layout><Electric /></Layout>} />
        <Route path="/settings" element={<Layout><Settings /></Layout>} />
        <Route path="/test" element={<Layout><TestPage /></Layout>} />
      </Routes>
    </Router>
  )
}

export default App
