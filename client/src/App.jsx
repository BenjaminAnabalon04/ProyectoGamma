import { useEffect, useState } from 'react'

// al cargar la pantalla, se hace una petición al servidor (API) para comprobar que está activo y funcionando correctamente
// si la petición es exitosa, se muestra el mensaje recibido del servidor
// si la petición falla, se muestra un mensaje de error
function App() {
  const [mensaje, setMensaje] = useState('Consultando al servidor...')
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('http://localhost:3000/api/v1/health')
      .then((respuesta) => respuesta.json())
      .then((datos) => setMensaje(datos.mensaje))
      .catch(() => {
        setError(true)
        setMensaje('No se pudo conectar con el servidor')
      })
  }, [])

  return (
    <div style={{ padding: '24px' }}>
      <h1>Portal de Terreno FYAG</h1>
      <p style={{ color: error ? 'crimson' : 'green' }}>{mensaje}</p>
    </div>
  )
}

export default App