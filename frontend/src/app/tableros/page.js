"use client"
import { useState, useEffect } from 'react';

function Boards() {
  const [groupedPins, setGroupedPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const response = await fetch('http://localhost:4000/boards', {
            method: 'GET',
          });
        if (!response.ok) {
          throw new Error('Error al cargar los tableros');
        }
        const data = await response.json();
        setGroupedPins(data); 
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchBoards();
  }, []);

  if (loading) {
    return <p>Cargando...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div>
  {groupedPins.map((categoryData) => (
    <div key={categoryData.category}>
      <h2>{categoryData.category}</h2>
      <div className="pin-container">
        {categoryData.pins.map((pin) => (
          <div key={pin.id} className="pin">
            <img
              src={pin.image_url}  
              alt={pin.title}
              className="pin-image" 
            />
            <h3>{pin.title}</h3>
            <p>{pin.description}</p>
          </div>
        ))}
      </div>
    </div>
  ))}
</div>

  );
}

export default Boards;
