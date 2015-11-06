# CUCM PIN

Script to set a random PIN for a Cisco Unified Communications Manager user and email it to them.  Tested against CUCM 10.5(2).

It uses [nodemailer](https://github.com/andris9/Nodemailer) with gmail for testing, but nodemailer can be configured to use any SMTP service.  See [their documentation](https://github.com/andris9/nodemailer-smtp-transport#usage) for more detail on that.

## Example Usage

`node CUCMPIN testuser testuser@domain.com`

## Getting up and running

The only external modules required for this script are:

* nodemailer
* xml2js

These can be installed by downloading this repository and running `npm install`.

Alternatively these can be installed manually by creating a new directory and running the following commands:

`npm install nodemailer`  
`npm install xml2js`

Once these are installed, you can download the script and amend the following variables at the top as required:

* _axlUser_ : this is an account with permissions for using AXL and updating the users pin
* _axlPassword_ : the password associated with that account
* _cucmHost_ : the hostname for the communications manager server
* _emailUser_ : the account that emails will be sent from (currently on gmail, but can be changed)
* _emailPassword_ : the password for the gmail account.  For testing I created an app password in gmail.


