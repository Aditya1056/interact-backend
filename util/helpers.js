const cryptoJs  = require('crypto-js');

exports.encryptMessage = (message) => {
    
    const cipherMessage = cryptoJs.AES.encrypt(message, process.env.CRYPTO_KEY).toString();

    return cipherMessage;
}

exports.decryptMessage = (cipherText) => {

    const decipherMessage = cryptoJs.AES.decrypt(cipherText, process.env.CRYPTO_KEY).toString(cryptoJs.enc.Utf8);

    return decipherMessage;
}