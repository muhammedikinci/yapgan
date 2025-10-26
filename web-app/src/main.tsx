import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './prose.css'

// Note: StrictMode causes double renders in development (intentional)
// Remove StrictMode if you don't want to see duplicate API calls in dev
ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
