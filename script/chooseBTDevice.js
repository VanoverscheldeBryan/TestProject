var bluetoothDevice;

function isWebBLEAvailable() {
  if (!navigator.bluetooth) {
    console.log('Not available!');
    return false;
  }
  return true;
}

function handleHeartRateMeasurementCharacteristic(characteristic) {
  return characteristic.startNotifications().then(char => {
    characteristic.addEventListener('characteristicvaluechanged', onHeartRateChanged);
  });
}

function onHeartRateChanged(event) {
  const characteristic = event.target;
  console.log(parseHeartRate(characteristic.value));
  document.querySelector('#HeartRate').innerHTML = parseHeartRate(characteristic.value).heartRate;
  // geef hartslag weer
}

function parseHeartRate(data) {
  const flags = data.getUint8(0);
  const rate16Bits = flags & 0x1;
  const result = {};
  let index = 1;
  if (rate16Bits) {
    result.heartRate = data.getUint16(index, /*littleEndian=*/ true);
    index += 2;
  } else {
    result.heartRate = data.getUint8(index);
    index += 1;
  }

  return result;
}

function onButtonClick() {
  let chosenHeartRateService = null;

  bluetoothDevice = null;
  console.log('Requesting any Bluetooth Device...');
  navigator.bluetooth
    .requestDevice({
      // filters: [...] <- Prefer filters to save energy & show relevant devices.
      filters: [
        {
          services: ['heart_rate']
        }
      ]
    })
    .then(
      device => {
        bluetoothDevice = device;
        console.log(bluetoothDevice);
        return device.gatt.connect();
      }
      //bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected);
      // connect();
    )
    .then(server => server.getPrimaryService('heart_rate'))
    .then(service => {
      chosenHeartRateService = service;
      Promise.all(service.getCharacteristic(service.getCharacteristic('heart_rate_measurement').then(handleHeartRateMeasurementCharacteristic)));
    })
    .then(ShowButton)
    .catch(error => {
      console.log('Argh! ' + error);
    });
}

// function getDevice() {
//   navigator.bluetooth.requestDevice().then(device => console.log(device.name));
// }

function connect() {
  exponentialBackoff(
    3 /* max retries */,
    2 /* seconds delay */,
    function toTry() {
      time('Connecting to Bluetooth Device... ');
      return bluetoothDevice.gatt.connect();
    },
    function success() {
      console.log('> Bluetooth Device connected. Try disconnect it now.');
      console.log(bluetoothDevice);
    },
    function fail() {
      time('Failed to reconnect.');
    }
  );
}

function onDisconnected() {
  console.log('> Bluetooth Device disconnected');
  connect();
}

/* Utils */

// This function keeps calling "toTry" until promise resolves or has
// retried "max" number of times. First retry has a delay of "delay" seconds.
// "success" is called upon success.
function exponentialBackoff(max, delay, toTry, success, fail) {
  toTry()
    .then(result => success(result))
    .catch(_ => {
      if (max === 0) {
        return fail();
      }
      time('Retrying in ' + delay + 's... (' + max + ' tries left)');
      setTimeout(function() {
        exponentialBackoff(--max, delay * 2, toTry, success, fail);
      }, delay * 1000);
    });
}

function time(text) {
  console.log('[' + new Date().toJSON().substr(11, 8) + '] ' + text);
}
function ShowButton() {
  document.getElementById('Volgende').style.display = 'block';
  document.getElementById('Zoekweg').style.display = 'none';
}

document.querySelector('form').addEventListener('submit', function(event) {
  event.stopPropagation();
  event.preventDefault();

  if (isWebBLEAvailable) {
    onButtonClick();
    // getDevice();
  }
});
