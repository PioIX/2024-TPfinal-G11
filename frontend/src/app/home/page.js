"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from "../styles/Home.module.css";

export default function Home() {
  const [userID, setUserID] = useState(null); 
  const [pins, setPins] = useState([]);
  const [image, setImage] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(""); 
  const [description, setDescription] = useState('');
  const router = useRouter();


  useEffect(() => {
    const storedUserID = localStorage.getItem('userID');
    if (storedUserID) {
      setUserID(storedUserID);
      fetchPins();
    } else {
      alert('No se encontró un ID de usuario.'); 
    }
  }, []);

  const fetchPins = async () => {
    try {
      const res = await fetch('http://localhost:4000/pins', {
        method: 'GET',
      });
      if (!res.ok) throw new Error('Error al cargar pins');
      const data = await res.json();
      setPins(data);
    } catch (error) {
      console.error('Error al cargar pins:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userID'); 
    router.push('/inicio/login');
  };

  const handleImageUpload = async () => {
    if (!image || !title || !description || !category) {
      alert('Por favor, proporciona un título, una descripción, una imagen y selecciona una categoría.');
      return;
    }
  
    const reader = new FileReader();
  
    reader.onloadend = async () => {
      const base64Image = reader.result;
      const storedUserID = localStorage.getItem('userID');
  
      const newPin = {
        title,
        description,
        image_base64: base64Image,
        userID: storedUserID,
        category, 
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
        setDescription('');
        setImage(null);
        setCategory(''); 
      } catch (error) {
        console.error('Error al subir imagen:', error);
        alert('No se pudo subir la imagen.');
      }
    };
  
    reader.readAsDataURL(image); 
  };
  

  function handleClick(pin) {
    console.log(pin.id);
    const url = "/pin?ID=" + pin.id;
    router.push(url);
  }

  const groupedPins = pins.reduce((acc, pin) => {
    const { category } = pin;
    if (!acc[category]) acc[category] = [];
    acc[category].push(pin);
    return acc;
  }, {});
  

return (
    <div className={styles.container}>
      <div className={styles.actions}>
        <button className={styles.button} onClick={handleLogout}>
          Cerrar Sesión
        </button>
        <button className={styles.button}>Tableros</button>
        
        <input
          type="text"
          placeholder="Título de la imagen"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        
        <textarea
          placeholder="Descripción del pin"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className={styles.textarea}
        ></textarea>
      
      <div className={styles.uploadFileButton}>
  <label htmlFor="fileInput">Seleccionar archivo</label>
  <input
    type="file"
    id="fileInput"
    onChange={(e) => setImage(e.target.files[0])}
    required
  />
</div>
  
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={styles.selectCategory} 
        >
          <option value="">Selecciona una categoría</option>
          <option value="Arte">Arte</option>
          <option value="Tecnología">Tecnología</option>
          <option value="Diseño">Diseño</option>
        </select>
  
        <button 
          className={styles.button} 
          onClick={handleImageUpload}
        >
          Subir Imagen
        </button>
      </div>
  
      <div className={styles.pinContainer}>
        {pins.map((pin, key) => (
          <div 
            key={key} 
            className={styles.pin} 
            onClick={() => handleClick(pin)}
          >
            <img src={pin.image_url} alt={pin.title} className={styles.image} />
            <h3 className={styles.pinTitle}>{pin.title}</h3>
            <p className={styles.pinUser}>Subido por: {pin.username}</p>
            <p className={styles.pinDescription}>{pin.description}</p> 
            <p className={styles.pinLikes}>{pin.likes} Likes❤️</p>
          </div>
        ))}
      </div>
    </div>
  );
}