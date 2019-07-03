// SYMULATOR SERWERA ARDUINO
const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const jwt = require('jsonwebtoken');
const five = require("johnny-five");
const axios = require('axios');


const debounceQueue = require ('debounce-queue');

const board = new five.Board({port: 'COM10'});
const switchAPI = 'http://localhost:3000/switches';

var ledy = [];


onChange = (state) => {
  
  const uniqueValues = (arr) => [...new Set(arr)]; // tworzy tablice unikalnch nazw z innej tablicy
  const lastPosition = (arr, name) => arr.lastIndexOf(name) // podaje numer ostatniego indexu pod którym wystąpił element
  const lastChanges = lastUniquePinChangesOf(state); // tablica ostatnich unikalnych zmian na pinie

  function lastUniquePinChangesOf(arr) {
    const onlyNames = arr.map(i=>i[0]) // tworzy tablice samych nazw
    var newArr = [] // tablica z ostatnimi zdarzeniami na danym pinie
    for (let i = 0; i < uniqueValues(onlyNames).length; i++) {
      newArr.push(arr[lastPosition(onlyNames, uniqueValues(onlyNames)[i])])
    }
    return newArr
  }
 
  
  console.log(lastChanges)
} 
const debounced = debounceQueue(onChange, 3000);
 


const getStateFromServer = async () => {
  try {
    const state = await axios.get(switchAPI);   
    ledy = state.data
    console.log(ledy)


  } catch (error) {
    console.error(error);
  }
}

getStateFromServer()



/// DEBOUNCE SAVE STATE IN API///

// const saveData = () => {
//   // wysyłanie ostatniego stanu arduino do API rails - historia przełączników
//   console.log("Zapisywanie danych ..");

// }

// const debounce = function (fn, d) {
//   let timer;
//   return function () {
//     let context = this,
//       args = arguments;
//     clearTimeout(timer);
//     timer = setTimeout(() => {
//       saveData.apply(context, arguments);
//     }, d);
//   }
// }

// const save = debounce(saveData, 2000);

/// DEBOUNCE SAVE STATE IN API ///


board.on("ready", () => {

  
  
  
    const leds = ledy.map(led => new five.Led(led.pin))
    const values = ledy.map(el => el.value)
    const names = ledy.map(el => el.name)


  /**
   * Documentation
   * @param {array} led array of johnny-five Led objects
   * @param {array} state array of values to set state (0-255, on, off, blink)
   */
    const setLedStates = (led, state) => {
      for (let i = 0; i < led.length; i++) {
        if (Number.isInteger(state[i])) {
          led[i].brightness(state[i]);
        }
        else
        {
          switch (state[i]) {
            case 'on':
              led[i].on()
              break;
            case 'blink':
              led[i].blink()
              break;
            default:
              led[i].off()
          }
        }
      }
    }

setLedStates(leds,values)
  
 
  

    

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

      save();
      // lightControl(data)
      
  
      // emituje dane do innych klientów oprócz samego wysyłającego 
      socket.broadcast.emit ('dane_zmiana_suwaka', data);
      })



      socket.on('switch', function(data){
        let pinName = data[0]
        let value = parseInt(data[1])
        let userName = socket.decoded.user.username
        let userPermission = socket.decoded.user.permission_policy
        let ledPosition = names.indexOf(pinName)

        checkPermission = (name) => userPermission[name];

        if (checkPermission(pinName)) {
          console.log(`${Date.now()} Użytkownik ${userName} ${socket.id} zmienia stan pinu ${pinName} na: ${value}`)

          leds[ledPosition].brightness(value);

          // zapis ostaniej akcji na danym pinie do bazy danych
          debounced(pinName, userName, value);

          // emituje dane do innych klientów oprócz samego wysyłającego 
          socket.broadcast.emit ('update-switch', data);
          
        } else { console.log('Użytkownik nie ma praw do zmiany stanu tego pinu lub pin nie istnieje') }

        })

      // socket.on('slider', function(data){
      //   // loguje dane
      //   console.log(`Lampke zapalił ${socket.id} i ustawił ${data}`);
      //   // if (socket.decoded.permission.reduce(data) == ) {
          
      //   // } else {
          
      //   // }
        
      //   // data.switchName
      //   // data.value

        

      //   // leds[1].brightness(data);
   
      //   // save();
      //   // // lightControl(data)
        
    
      //   // // emituje dane do innych klientów oprócz samego wysyłającego 
      //   // socket.broadcast.emit ('dane_zmiana_suwaka', data);
      //   })
  
  });

 

});

















 
http.listen(3030, function(){
  console.log('listening on *:3030');
});



