const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');

require('dotenv').config();
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// Conectar a MongoDB

const uridb = `mongodb+srv://DarellGutierrez:bLanBGeJYLIVqRLl@proyectotic.7p0eur3.mongodb.net/?retryWrites=true&w=majority&appName=ProyectoTIC`;
mongoose.connect(uridb) //borré useNewUrlParser y useUnifiedTopology ya que no se usan en las nuevas versiones de node
.then(() => console.log("base de datos conectada")) 
.catch(e => console.log(e))

/*const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI).then(() => {
    console.log('Connected to MongoDB Atlas');
}).catch((error) => {
    console.error('Error connecting to MongoDB Atlas:', error);
});
*/

// Configurar express-session para manejar sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'mysecret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // 1 día
    }
}));

// Definir esquemas
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
});
const User = mongoose.model('User', userSchema);

// Define the data schema
const dataSchema = new mongoose.Schema({
    temperatura: Number,
    humedad: Number,
    metano: Number,
    ambiente: Number,
    ruido: Number,
    time: String
});
const Data = mongoose.model('Data', dataSchema);


// Dirección de archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/overview', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'public', 'overview.html'));
    } else {
        res.redirect('/login');
    }
});

app.get('/statistics', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'public', 'statistics.html'));
    } else {
        res.redirect('/login');
    }
});

app.post('/sign_user', (req, res) => {
    const { username, password1, password2 } = req.body;

    if (password1 !== password2) {
        return res.status(400).json({ error: 'Las contraseñas no coinciden.' });
    }

    User.findOne({ username })
        .then(existingUser => {
            if (existingUser) {
                return res.status(400).json({ error: 'El usuario ya existe.' });
            }

            const newUser = new User({
                username,
                password: password1,
            });

            newUser.save()
                .then(() => {
                    res.status(200).json({ message: 'Usuario registrado con éxito' });
                })
                .catch((error) => {
                    res.status(500).json({ error: 'Error al registrar el usuario: ' + error.message });
                });
        })
        .catch(error => {
            res.status(500).json({ error: 'Error: ' + error.message });
        });
});

app.post('/log_user', (req, res) => {
    const { username, password } = req.body;

    User.findOne({ username, password })
        .then(user => {
            if (!user) {
                return res.status(400).send('Usuario o contraseña incorrectos.');
            }

            // Iniciar sesión y almacenar el usuario en la sesión
            req.session.user = user;
            res.status(200).send('Inicio de sesión exitoso');
        })
        .catch(error => {
            res.status(500).send('Error al iniciar sesión: ' + error.message);
        });
});


app.get('/exit', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Error al cerrar sesión: ' + err.message);
        }
        res.redirect('/home');
    });
});

app.get('/showUsers', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);

    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ message: 'Error al obtener usuarios' });
    }
});

//Variables:
app.post('/addData', async (req, res) => {
    const { temperatura, humedad, metano, ambiente, ruido } = req.body;
    const currentTime = new Date().toLocaleString();

    try {
        // Save the data to the database
        await Data.create({
            temperatura,
            humedad,
            metano,
            ambiente,
            ruido,
            time: currentTime
        });

        res.status(200).json({ message: 'Data added successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error adding data: ' + error.message });
    }
});

//get latest:
app.get('/getLatestData', (req, res) => {
    // Find the latest entry in the Data collection
    Data.findOne().sort({ _id: -1 }).limit(1)
        .then((latestData) => {
            if (latestData) {
                // If data is found, return it as JSON response
                res.status(200).json({
                    temperatura: latestData.temperatura,
                    humedad: latestData.humedad,
                    metano: latestData.metano,
                    ambiente: latestData.ambiente,
                    ruido: latestData.ruido
                });
            } else {
                // If no data is found, return a 404 error
                res.status(404).json({ error: 'No data found' });
            }
        })
        .catch((error) => {
            // If there's an error, return a 500 error
            res.status(500).json({ error: 'Error fetching data: ' + error.message });
        });
});

app.post('/addExampleData', (req, res) => {
    const currentTime = new Date().toLocaleString();

    // Generate random numbers for each parameter within a specified range
    const randomData = {
        temperatura: Math.random() * (40), // Random temperature between 0 and 40
        humedad: Math.random() * (100 - 10) + 10,    // Random humidity between 10 and 100
        metano: Math.random() * (800 - 100) + 100,   // Random metano between 100 and 800
        ambiente: Math.random() * (800 - 100) + 100, // Random ambiente between 100 and 800
        ruido: Math.random() * (100 - 50) + 50      // Random ruido between 1 and 100
    };

    // Save random data for each parameter to the database
    Data.create({
        temperatura: randomData.temperatura,
        humedad: randomData.humedad,
        metano: randomData.metano,
        ambiente: randomData.ambiente,
        ruido: randomData.ruido,
        time: currentTime
    })
    .then(() => {
        res.status(200).json({ message: 'Random data added successfully' });
    })
    .catch((error) => {
        res.status(500).json({ error: 'Error adding random data: ' + error.message });
    });
});


app.get('/showData', async (req, res) => {
    try {
        // Retrieve all data
        const allData = await Data.find();

        // Separate data for each parameter
        const data = {
            temperatura: [],
            humedad: [],
            metano: [],
            ambiente: [],
            ruido: []
        };

        // Extract data for each parameter
        allData.forEach(entry => {
            data.temperatura.push({ time: entry.time, value: entry.temperatura });
            data.humedad.push({ time: entry.time, value: entry.humedad });
            data.metano.push({ time: entry.time, value: entry.metano });
            data.ambiente.push({ time: entry.time, value: entry.ambiente });
            data.ruido.push({ time: entry.time, value: entry.ruido });
        });

        // Send the formatted data
        res.json(data);
    } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
