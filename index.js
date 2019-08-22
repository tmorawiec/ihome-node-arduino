const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const jwt = require('jsonwebtoken');
const five = require("johnny-five");
const axios = require('axios');
const debounceQueue = require ('debounce-queue');

const board = new five.Board({port: 'COM4'});
const switchAPI = 'http://localhost:3000/switches.json';
const historyAPI = 'http://localhost:3000/histories';

var ledy = [];


filterAndSave = (objects) => {
  // unfiltred data
  const history = objects.map(i=>i[0])

  // filtred by max timeStamp in unique names
  const lastChanges = Object.values(history.reduce(
    (r, o) => { 
      r[o.name] = r[o.name] && r[o.name].timeStamp > o.timeStamp ? r[o.name] : o
      return r }, {}))

  // save to DB filtred data
  lastChanges.map(x => postStateToHistory(x));

  console.log(ledy)
} 



const debouncedSaveToDB = debounceQueue(filterAndSave, 3000);
 


const getStateFromServer = async () => {
  try {
    const state = await axios.get(switchAPI);   
    ledy = state.data
    console.log(ledy)


  } catch (error) {
    console.error(error);
  }
}

const postStateToHistory = async (obj) => {

  axios.post(historyAPI, {
    "switch_name": obj.name,
    "user_name": obj.user,
    "value": obj.value,
    "timeStamp": obj.timeStamp,
  })
  .then(function (response) {
    console.log(`Użytkownik ${response.data.user} zapisał w Bazie danych stan switcha: ${response.data.switch}, wartość: ${response.data.value}`);
  })
  .catch(function (error) {
    console.log(error);
  });
}

getStateFromServer()
// postStateToHistory()


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
    const values = ledy.map(el => parseInt(el.state.value))
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
      jwt.verify(socket.handshake.query.token, 'd105bba7e66439af4bdf70653143aca9a69fc87db14c299ffd2457ac2ec52ac64758044a521f45d3eed469dfbdbb1b58f38c2f692bda99cb264acb06b80f0858', function(err, decoded) {
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

      // wysłanie do nowo podłączonego użytkownika tablicy z aktualnym stanem ledów
      socket.emit('hello', ledy);
  
      // socket.on('SEND_MESSAGE', function(data){
      //   console.log(data);
      //   // TU BĘDĄ WSTAWIONE DANE KTO WYWOŁAŁ TĄ AKCJĘ:
      //   socket.broadcast.emit ('FromAPI', `wiadomość zwrotna wysłana przez ${socket.id}`);
      // })
  




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

          // ustawienie tablicy led aktulną wartością
          ledy[ledPosition].state.value = value
          
   
            // jako obiekt w tablicy
            debouncedSaveToDB({
              name: pinName,
              value: value,
              user: userName,
              timeStamp: Date.now()
            })

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



