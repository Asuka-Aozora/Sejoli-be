require('dotenv').config();
const mysql = require('mysql2');
const crypto = require('crypto');

// Konfigurasi koneksi database (isi dari db.js)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
const db = pool.promise(); // hasil akhir db

// Constants
const ENC_KEY = process.env.ENC_KEY;
const IV_LENGTH = parseInt(process.env.IV_LENGTH) || 16;
const JWT_EXPIRED_TIME = process.env.JWT_EXPIRED_TIME || 24 * 60;

// Middleware cekToken
exports.cekToken = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.API_KEY) {
        console.log("cekToken forbidden", apiKey);
        return res.status(403).json({
            status: 'forbidden',
            code: 403,
            message: 'Forbidden: Invalid API Key'
        });
    }
    console.log("cekToken pass");
    next();
};

function setResponse (dt) {
    let json={};
    if (!dt.err) {
        dt.code=200;
        dt.status="success";
    }else{
        dt.code=500;
        dt.status="failed";
    }
    let msg=dt.flow[dt.flow.length-1].split('|')[1];
    json.message=msg;
    json.code=dt.code;
    json.status=dt.status;
    if (dt.data) {
        json.data=dt.data;
    }
    if (dt.meta) {
        json.meta=dt.meta;
    }
    return json;
}

function safeDeserialize(data) {
    if (!data) return null;
    try {
        return JSON.parse(data);
    } catch (e) {
        return null;
    }
}

function isBase64(str) {
    if (!str) return false;
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    return base64Regex.test(str) && str.length % 4 === 0;
}

// Encryption functions
function encrypt(data, key = ENC_KEY) {
    try {
        if (!data) throw new Error('Data is required for encryption');
        
        // Ensure key is 32 bytes for AES-256
        const keyBuffer = crypto.scryptSync(key, 'salt', 32);
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
        
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        // Return IV and encrypted data
        return Buffer.from(encrypted + '::' + iv.toString('hex')).toString('base64');
    } catch (error) {
        console.error('Encryption error:', error);
        return null;
    }
}

function decrypt(data, key = ENC_KEY) {
    try {
        if (!data) throw new Error('Data is required for decryption');
        
        // Ensure key is 32 bytes for AES-256
        const keyBuffer = crypto.scryptSync(key, 'salt', 32);
        
        const raw = Buffer.from(data, 'base64').toString();
        const [encryptedData, ivHex] = raw.split('::');
        
        if (!encryptedData || !ivHex) throw new Error('Invalid encrypted data format');
        
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
        
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        return null;
    }
}

// Token encoding/decoding functions
function enc(s, type = 'array') {
    try {
        if (type === 'array') {
            s = JSON.stringify(s);
        }
        
        // Convert string ke array of ASCII codes + 2
        const r = Array.from(s).map(char => char.charCodeAt(0) + 2);
        
        // Join dengan dot dan replace karakter
        let a = r.join('.')
            .replace(/1/g, '_')
            .replace(/0/g, ':')
            .replace(/9/g, '-')
            .replace(/5/g, '1');
        
        return encrypt(a);
    } catch (error) {
        console.error('Encoding error:', error);
        return null;
    }
}

function dec(s, type = 'array') {
    try {
        // Decrypt string
        let decrypted = decrypt(s);
        if (!decrypted) return null;
        
        // Replace karakter kembali
        decrypted = decrypted
            .replace(/1/g, '5')
            .replace(/-/g, '9')
            .replace(/:/g, '0')
            .replace(/_/g, '1');
        
        // Split string dan convert ASCII codes kembali ke karakter
        const chars = decrypted.split('.').map(code => 
            String.fromCharCode(parseInt(code) - 2)
        );
        
        const result = chars.join('');
        return type === 'array' ? safeDeserialize(result) : result;
    } catch (error) {
        console.error('Decoding error:', error);
        return null;
    }
}

// Token management functions
const generateToken = (req, userId, optionalData = '-') => {
    try {
        const userAgent = req.headers['user-agent'] || '-';
        const tokenData = [
            userId,
            new Date().toISOString(),
            optionalData,
            userAgent
        ];
        
        const tokenPlain = tokenData.join('|');
        const tokenFinal = encrypt(tokenPlain);
        return tokenFinal ? Buffer.from(tokenFinal).toString('base64') : null;
    } catch (error) {
        console.error('Token generation error:', error);
        return null;
    }
};

const verifyToken = async (req) => {
    const result = {
        error: false,
        code: 200,
        status: 'token_valid',
        message: 'Token valid',
        userId: null,
        flow: []
    };

    try {
        // Get token from header or body
        let token = req.headers.authorization || req.headers['Authorization'] || req.headers.token || req.body?.token;
        
        if (!token || token === 'null') {
            throw new Error('Token required');
        }

        // Validate and decode token
        const decodedToken = Buffer.from(token, 'base64').toString();
        const decryptedToken = decrypt(decodedToken);
        if (!decryptedToken) throw new Error('Invalid token format');

        const tokenParts = decryptedToken.split('|');
        if (tokenParts.length !== 4) throw new Error('Invalid token segments');

        const [userId, createdTime, tokenOs, tokenUa] = tokenParts;
        result.userId = userId;

        // Validate expiration
        const created = new Date(createdTime);
        const now = new Date();
        const diffMinutes = Math.floor((now - created) / 1000 / 60);
        
        if (diffMinutes > JWT_EXPIRED_TIME) {
            if (tokenOs !== '-') {
                await pool.query(
                    'DELETE FROM wp_usermeta WHERE user_id = ? AND meta_key = ?',
                    [userId, `token_${tokenOs}`]
                );
            }
            throw new Error('Token expired');
        }

        // Validate OS and User Agent
        if (tokenOs !== '-' && tokenOs !== req.body?.os) {
            throw new Error('Invalid OS');
        }

        const currentUa = req.headers['user-agent'] || '-';
        if (tokenUa !== currentUa) {
            throw new Error('Invalid User Agent');
        }

        return result;

    } catch (error) {
        return {
            ...result,
            error: true,
            code: 401,
            status: 'token_invalid',
            message: error.message,
            flow: [...result.flow, `verifyToken() > ${error.message}`]
        };
    }
};

const verifyRole = async (req, role=[]) => {
    const result = {
        error: false,
        code: 200,
        status: 'role_valid',
        message: 'Role valid',
        flow: []
    };

    let rows=[];

    try {
        const query=`SELECT * FROM wp_usermeta WHERE user_id = ? AND meta_key = 'role'`;
        [rows] = await db.query(query, [req.userId]);

    } catch (error) {
        console.log(error);
        return {
            error: true,
            code: 500,
            message: 'Query DB error'
        };
    }

    if (rows.length === 0) {
        return {
            error: true,
            code: 404,
            message: 'User not found'
        };
    }
    let userRole=rows[0].meta_value;
    
    if (role.length > 0 && !role.includes(userRole)) {
        return {
            error: true,
            code: 404,
            message: 'User role not found'
        };
    }

    return result;

}

// Middleware
function otorisasi(role) {
    return async function(req, res, next) {

    const result = await verifyToken(req);
    
    if (result.error) {
        return res.status(result.code).json({
            status: result.status,
            message: result.message
        });
    }

    if (!result.userId) {
        return res.status(result.code).json({
            error: true,
            code: 404,
            message: 'Token UserID not found'
        });
    }
    req.userId = result.userId;

    const resultRole = await verifyRole(req, role);
    
    if (resultRole.error) {
        return res.status(resultRole.code).json({
            error: true,
            code: resultRole.code,
            message: resultRole.message
        });
    }

    next();
}};

// Exports
module.exports = {
    db,
    generateToken,
    verifyToken,
    otorisasi,
    safeDeserialize,
    isBase64,
    encrypt,
    decrypt,
    enc,
    dec,
    setResponse,
};