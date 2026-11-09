import app from "./src/app.js";
import 'dotenv/config'

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
    console.log(`ParkEase is running successfully!! on PORT: ${PORT}`)
})
