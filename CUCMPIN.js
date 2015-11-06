/**
* @fileOverview Communications Manager PIN Reset
* @author Darren Parkinson
* @version 1.0
* @license mit
* @requires nodemailer, xmljs
*/
'use strict';
/* jshint node: true */

// *** Modules ***
var https = require('https');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var xml2js = require('xml2js');

// *** Set Up Debug ***
var DEBUG = false;
//TODO: Set up more debug stuff...

// ***
// *** Variables to change ***
// ***

var axlUser = 'ccmadmin';
var axlPassword = 'yourpasswordhere';
var cucmHost = 'hostnameforyourcucmserverhere';
var emailUser = 'youruserid@gmail.com';
var emailPassword = 'yourgmailpasswordhere';

// ***
// *** Variables to leave alone ***
// ***

var authentication = axlUser + ':' + axlPassword;

/** Headers for the CUCM request. */
var headers = {
  'SoapAction':'CUCM:DB ver=9.1',
  'Authorization': 'Basic ' + new Buffer(authentication).toString('base64'),
  'Content-Type': 'text/xml; charset=utf-8'
};

var options = {
  host: cucmHost,        // The IP Address of the Communications Manager Server
  port: 443,                  // Clearly port 443 for SSL -- I think it's the default so could be removed
  path: '/axl/',              // This is the URL for accessing axl on the server
  method: 'POST',             // AXL Requires POST messages
  headers: headers,           // using the headers we specified earlier
  rejectUnauthorized: false   // required to accept self-signed certificate
};

// ***
// *** Functions ***
// ***

/**
 * Generates random string of numbers given quantity.
 * It will use numbers 0-9.
 * This function is not used and is an example of a simpler psuedo random generation.
 * @param {number} length - how many characters returned in result
 * @returns {string} - PIN
*/
function pseudoRandom(length) {
  var returnPIN = '';
  for (var i = 0; i < length; i++) {
    returnPIN += Math.floor(Math.random() * (10 - 0) + 0);
  }
  return returnPIN;
}

/**
 * Generates random string given quantity and characters to use.
 * By default, it will use numbers 0-9.
 * @param {number} howMany - how many characters returned in result
 * @param {string} chars - Characters allowed in result (optional)
 * @returns {string} - PIN
*/
function random(howMany, chars) {
  chars = chars || "0123456789";
  var rnd = crypto.randomBytes(howMany);
  var value = new Array(howMany);
  var len = chars.length;

  for (var i = 0; i < howMany; i++) {
    value[i] = chars[rnd[i] % len];
  }
  return value.join('');
}

/**
 * Used to generate the PIN using either the pseudoRandom or random functions included.
 * @param {number} pinlength - how long you want the pin to be.
 * @returns {string} - PIN
*/
function generatePIN(pinlength) {
  return random(pinlength || 4);
}

/**
 * Send an email to the specified recipient
 * @param {string} pin - PIN to send the recipient
 * @param {string} toRecipient - Recipient email address
*/
function sendEmailWithPIN(pin, toRecipient) {
  var transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: emailUser,
        pass: emailPassword
    }
  });

  var mailOptions = {
    from: emailUser,
    to: toRecipient,
    subject: "Your new Communications Manager PIN",
    text: "Your new Communications Manager PIN is " + pin,
    html: "Your new Communications Manager PIN is <b>" + pin + "</b>"
  };
  console.log("Sending email to " + toRecipient);
  transporter.sendMail(mailOptions, function(error, info){
    if(error){
      return console.log(error);
    }
    console.log("Message sent: " + info.response);
  });
}

/**
 * Update the user's PIN and send them an email if successful.
 * @param {string} userid - CUCM User ID
 * @param {string} emailaddress - Email Address to send PIN.
*/
function updateUserPIN(userid, emailaddress) {
  var responseData = '';
  var pin = generatePIN();
  var updateUserSoapBody = new Buffer('<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:axl="http://www.cisco.com/AXL/API/9.1">' +
     '<soapenv:Header/>' +
     '<soapenv:Body>' +
      '<axl:updateUser>' +
        '<userid>' + userid + '</userid>' +
        '<pin>' + pin + '</pin>' +
      '</axl:updateUser>' +
     '</soapenv:Body>' +
  '</soapenv:Envelope>');

  var req = https.request(options, function(res) {
    if (DEBUG) {console.log("status code = ", res.statusCode);}
    if (DEBUG) {console.log("headers = " , res.headers);}
    res.setEncoding('utf8');
    res.on('data', function(d) {
      responseData += d;
    });
    res.on('end', function() {
      var parser = new xml2js.Parser();
      parser.parseString(responseData, function (err, result) {
        if (err) { return console.log("Error: " + err); }
        // Check we have a SOAP object:
        if (Object.prototype.hasOwnProperty.call(result, 'soapenv:Envelope')) {
          // Check it's not a fault message:
          if (Object.prototype.hasOwnProperty.call(result['soapenv:Envelope']['soapenv:Body'][0], 'soapenv:Fault')) {
            return console.log("Error: " + result['soapenv:Envelope']['soapenv:Body'][0]['soapenv:Fault'][0]['faultstring'][0] );
          }
          if (Object.prototype.hasOwnProperty.call(result['soapenv:Envelope']['soapenv:Body'][0], 'ns:updateUserResponse')) {
            // I believe we have success, therefore send to the user.
            console.log('PIN Updated');
            sendEmailWithPIN(pin, emailaddress);
          }
        // If we don't have a SOAP Object, let the user know.
        } else {
          return console.log('No SOAP Object returned, check the username and password.');
        }
      });

    });
  });

  req.write(updateUserSoapBody);
  req.end();
  req.on('error', function(e) {
    console.error(e);
  });
}

/**
 * Function to output user instructions.
*/
function outputUsage() {
  console.log("\nCUCMPIN Usage: ");
  console.log("   node CUCMPIN userid emailaddress");
  console.log("\nWhere:\n");
  console.log("   userid       : is the userid on Communications Manager for the user whose pin you wish to change");
  console.log("   emailaddress : is the email address to send the pin to\n");
}

// ***
// *** Main ***
// ***

if (process.argv.length < 4) {
  outputUsage();
  process.exit(1);
} else {
  updateUserPIN(process.argv[2], process.argv[3]);
}
