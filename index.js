// SYMULATOR SERWERA ARDUINO
var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var jwt = require('jsonwebtoken');
var five = require("johnny-five");

const board = new five.Board({port: 'COM10'});
const leds = [];
const arduinoIOs = [13, 11, 10, 9, 6];







board.on("ready", () => {

  arduinoIOs.forEach(element => {
    leds.push(new five.Led(element))
  });

  leds[4].on()

 

});

/// DEBOUNCE SAVE STATE IN API///
let counter = 0;
const saveData = () => {
  // wysyłanie ostatniego stanu arduino do API rails - historia przełączników
  console.log("Zapisywanie danych ..", counter++);
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
const saveStateInAPI = debounce(saveData, 2000);
/// DEBOUNCE SAVE STATE IN API ///



lightControl = (data) => {
  // przyjmuje dane: 
  // numer leda, stan, użytkownik?
  
    
  // walidacja danych 0-255
  if ((data >= 0 ) && (data <= 255)) {
    // ustawienie stanu arduino
    leds[1].brightness(data)
    // zapis stanu w bazie danych
    saveStateInAPI()
  } else {
    console.error('must be number between 0-255');
  }
    
}








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

    
    
   

    lightControl(data)
    
    

    


    // emituje dane do innych klientów oprócz samego wysyłającego 
    socket.broadcast.emit ('dane_zmiana_suwaka', data);
  })

});


 
http.listen(3030, function(){
  console.log('listening on *:3030');
});



