import Comments from './Comments'; // Importamos el componente de comentarios

const Pin = ({ pin }) => (
  <div className="pin">
    <h3>{pin.title}</h3>
    <img src={pin.image_url} alt={pin.title} />
    <p>{pin.likes}Likes ❤️</p>

    {/* Mostrar los comentarios del pin */}
    <Comments pinId={pin.id} />
  </div>
);

export default Pin;
