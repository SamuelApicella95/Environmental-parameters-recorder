const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(cors());

let recTH;
let statusRecTH = false;

// Input: null
// Output: this function return a json object,
// the json object represents a new instant sample
// of temperature and humidity
// {
//   temperature:  ...,
//   humidity:     ...,
// }
// in other case (such as error) return 500

app.get('/temphumLive', (req, res) => {
  let t_h = spawn('python3', ['dht_readData.py']);
  let th, t, h;
  t_h.stdout.on('data', (data) => {
    th = `${data}`.split(" ");
    t = th[0];
    h = th[1];
    h = h.substring(0,4);// to remove /n
    res.json({temperature: t, humidity: h});
  });
	
  t_h.stderr.on('data', (data) => {
    console.log('err');
    console.error(`stderr: ${data}`);
    res.sentStatus(500);
  });
});

// Input: null
// Output: this function return an array of json object,
// each json object represents a single sample of
// temperature and humidity
// {
//   date:         ...,
//   temperature:  ...,
//   humidity:     ...,
// }
// if no stats has recorded it return 204
// in other case (such as error) return 500
app.get('/fetchesData', (req, res) => {
  // step: stop, send, delete and restart
  clearInterval(recTH);
  //check if file with stats exist
  if(!(fs.existsSync('dataTH.txt'))) res.sendStatus(204);
  
  const stream = fs.createReadStream('dataTH.txt');
  // [ and ] for create an array to send
  let pipeline = async () => {
    await fs.writeFile('dataTH.txt', '[', { flag: 'w+' }, err => {})
    await stream.pipe(res);
    await fs.writeFile('dataTH.txt', ']', { flag: 'a+' }, err => {})
  }
  pipeline();
  let asy = async () => {
  
    //delete file
    await fs.unlink('dht_readData.py', err => {
 	    if (err) {
        console.log(err);
        res.sentStatus(500);
        //return;
 	    }
    });
    
 	  //restart record if...
    if(statusRecTH == true) recTH = startTHRecorder();
  }
});

app.get('/temphumStop', (req, res) => {
  statusRecTH = false;
  clearInterval(recTH);
});

app.get('/temphumStart', (req, res) => {
  statusRecTH = true;
  startTHRecorder();
});

function startTHRecorder(){
  let recTH = setInterval(() => {
    let t_h = spawn('python3', ['dht_readData.py']);
    let th, t, h;
    t_h.stdout.on('data', (data) => {
      th = `${data}`.split(" ");
      t = th[0];
      console.log(t);
      if(t == "Checksum") return;
      h = th[1];
      h = h.substring(0,4);// to remove /n
      let date_ob = new Date();
   	  /*let date = date_ob.getFullYear() + ", " + (date_ob.getMonth()+1) + ", " + date_ob.getDate() + ", " + date_ob.getHours() + ", " + date_ob.getMinutes() + ", " + date_ob.getSeconds();*/
      const content = JSON.stringify({date: date_ob, temperature: t, humidity: h})+",";
	    fs.appendFile('dataTH.txt', content, err => {
    	  if (err) {
    		  console.error(err)
    		  return
    	  }
    	  console.log(content);
    	  //file written successfully
	    })
    });
  }, 2000);// every 2 sec
}

app.listen(3000);
