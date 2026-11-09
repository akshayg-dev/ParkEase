import app from './src/app.js';
import 'dotenv/config';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `ParkEase backend is running successfully!! on PORT: ${PORT} in ${process.env.NODE_ENV} mode`,
  );
});
