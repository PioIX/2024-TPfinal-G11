    import { useEffect, useState } from 'react';
    import io from 'socket.io-client';

    const socket = io('http://localhost:3001');

    export default function PinComponent({ pin }) {
    const [likes, setLikes] = useState(pin.likes);

    useEffect(() => {
        socket.on('update_likes', ({ pinId }) => {
        if (pinId === pin.id) setLikes((prev) => prev + 1);
        });

        return () => socket.off('update_likes');
    }, [pin.id]);

    const handleLike = () => socket.emit('like_pin', pin.id);

    return (
        <div>
        <img src={pin.image_url} alt={pin.title} />
        <h2>{pin.title}</h2>
        <p>{likes} Likes</p>
        <button onClick={handleLike}>Like</button>
        </div>
    );
    }
