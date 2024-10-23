"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from "../styles/Home.module.css";

export default function Home() {
  const [pins, setPins] = useState([]);
  const [image, setImage] = useState(null);
  const [title, setTitle] = useState('');
  const router = useRouter();

  // Obtener pins al cargar el componente
  useEffect(() => {
    async function fetchPins() {
      const res = await fetch('http://localhost:4000/pins');
      const data = await res.json();
      setPins(data);
    }
    fetchPins();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('inicio/login');
  };

  const handleImageUpload = async (e) => {
    e.preventDefault();
    const reader = new FileReader();
  
    reader.onloadend = async () => {
      const base64Image = reader.result;
  
      const newPin = {
        title,
        image_base64: base64Image, // Enviamos la imagen como Base64
      };
  
      try {
        const res = await fetch('http://localhost:4000/pins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPin),
        });
  
        if (!res.ok) throw new Error(`Error: ${res.status}`);
        const createdPin = await res.json();
        setPins((prevPins) => [...prevPins, createdPin]);
  
        setTitle('');
        setImage(null);
      } catch (error) {
        console.error('Error al subir imagen:', error);
        alert('No se pudo subir la imagen.');
      }
    };
  
    reader.readAsDataURL(image); // Convierte la imagen a Base64
  };
  
  
  return (
    <div className={styles.container}>
      {/* Barra de acciones */}
      <div className={styles.actions}>
        <button className={styles.button} onClick={handleLogout}>Cerrar Sesión</button>
        <button className={styles.button}>Tableros</button>
        <form onSubmit={handleImageUpload} className={styles.uploadForm}>
          <input
            type="text"
            placeholder="Título de la imagen"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <input
            type="file"
            onChange={(e) => setImage(e.target.files[0])}
            required
          />
          <button type="submit" className={styles.button}>Subir Imagen</button>
        </form>
      </div>

      {/* Listado de pins */}
      <div className={styles.pinContainer}>
  {pins.map((pin) => (
    <div key={pin.id} className={styles.pin}>
      <img src={pin.image_url} alt={pin.title} className={styles.image} />
      <h3 className={styles.pinTitle}>{pin.title}</h3>
      <p>{pin.likes} Likes</p>
    </div>
  ))}
</div>
    </div>
  );
}
