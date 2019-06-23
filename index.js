// SYMULATOR SERWERA ARDUINO
const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const jwt = require('jsonwebtoken');
const five = require("johnny-five");
const axios = require('axios');

const board = new five.Board({port: 'COM10'});

const getSwitches = () => {
  try {
    return axios.get('http://localhost:3000/switches')
  } catch (error) {
    console.error(error)
  }
}

const test = async () => {
  const breeds = getSwitches()
    .then(response => {
      if (response.data) {

        console.log(
          response.data
        )
      }
    })
    .catch(error => {
      console.log(error)
    })
}

test()


// array of devices last states
const deviceState = [
  {
    description: 'hall',
    io: 13,
    value: 0,
    user: 'system',
    timestamp: Date.now()
  },
  {
    description: 'main room',
    io: 11,
    value: 0,
    user: 'system',
    timestamp: Date.now()
  },
  {
    description: 'bedroom',
    io: 10,
    value: 0,
    user: 'system',
    timestamp: Date.now()
  },
  {
    description: 'bathroom',
    io: 9,
    value: 0,
    user: 'system',
    timestamp: Date.now()
  },
  {
    description: 'kitchen',
    io: 8,
    value: 0,
    user: 'system',
    timestamp: Date.now()
  }
]


/// DEBOUNCE SAVE STATE IN API///

const saveData = () => {
  // wysyłanie ostatniego stanu arduino do API rails - historia przełączników
  console.log("Zapisywanie danych ..");

}

const debounce = function (fn, d) {
  let timer;
  return function () {
    let context = this,
      args = arguments;
    clearTimeout(timer);
    timer = setTimeout(() => {
      saveData.apply(context, arguments);
    }, d);
  }
}

const save = debounce(saveData, 2000);

/// DEBOUNCE SAVE STATE IN API ///


board.on("ready", () => {

  // initialize array of leds objects
  const leds = deviceState
    .map(led => new five.Led(led.io));


    

  // initialize socket.io with JWT
  io.use(function(socket, next){
    if (socket.handshake.query && socket.handshake.query.token){
      jwt.verify(socket.handshake.query.token, 'privatekey', function(err, decoded) {
        if(err) return next(new Error('Authentication error'));
        socket.decoded = decoded;
        next();
      });
    } else {
        next(new Error('Authentication error'));
    }    
  })
  .on('connection', function(socket) {
      console.log(socket.id);
      console.log(socket.decoded);
      // Connection now authenticated to receive further events
  
      socket.on('SEND_MESSAGE', function(data){
        console.log(data);
        // TU BĘDĄ WSTAWIONE DANE KTO WYWOŁAŁ TĄ AKCJĘ:
        socket.broadcast.emit ('FromAPI', `wiadomość zwrotna wysłana przez ${socket.id}`);
      })
  
      // odbiera dane od klienta o poruszeniu suwaka
      socket.on('suwak', function(data){
      // loguje dane
      console.log(`Lampke zapalił ${socket.id} i ustawił ${data}`);
      leds[1].brightness(data);
      countBreeds();
      save();
      // lightControl(data)
      
  
      // emituje dane do innych klientów oprócz samego wysyłającego 
      socket.broadcast.emit ('dane_zmiana_suwaka', data);
      })
  
  });

 

});

















 
http.listen(3030, function(){
  console.log('listening on *:3030');
});



