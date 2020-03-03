let _ = require("lodash");
let crypto = require('crypto');
let util = require('util');
let sprintf = require('sprintf-js').sprintf;

function mineBlock(block, difficulty='000') {
    let attempts = 0;

    // Select an initial random number to try from
    block.header.nonce = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    do {
        attempts++;
        block.header.nonce++;
        block.hash = crypto.createHash('sha256')
                           .update(Buffer.from(JSON.stringify(block.header)))
                           .digest('hex');
    } while (!_.startsWith(block.hash, difficulty))

    return attempts;
}

function verifyBlock(block) {
    // Make sure the dataHash (merkle root in bitcoin lingo) is correct
    let dataHash = crypto.createHash('sha256').update(block.data).digest('hex');
    if (block.header.dataHash != dataHash) {
        console.log("ERR: Data hash %s != %s (height: %d)", block.header.dataHash, dataHash, block.header.height);
        return false;
    }

    // Make sure the the hash of the header is correct
    let headerBuf = Buffer.from(JSON.stringify(block.header));
    let headerHash = crypto.createHash('sha256').update(headerBuf).digest('hex');
    if (headerHash != block.hash) {
        console.log("ERR: Header hash %s != %s (height: %d)", headerHash, block.hash, block.header.height);
        return false;
    }

    return true
}

function generateBlock() {
    data = util.format("Transaction random data (v=%f)", Math.random())
    return {
        hash: "",
        header: {
            height: 0,
            prevHash: "",
            timestamp: Math.floor(new Date() / 1000),
            dataHash:  crypto.createHash('sha256').update(data).digest('hex'),
            nonce: 0
        },
        data: data
    }
}

function verifyChain(chain) {
    // Make sure every block is valid (follows consensus rules)
    if (!chain.every(verifyBlock)) {
        return false;
    }

    // Make sure every block points the prevHash of the previous block (i.e. chain is valid)
    for(i = chain.length -1; i >= 1; i--) {
        prev = chain[i - 1];
        curr = chain[i];

        if (curr.header.prevHash != prev.hash) {
            console.log("ERR: prev hash %s != %s (height: %d)", curr.header.prevHash, prev.hash, curr.header.height);
            return false;
        }
    }

    return true
}

function generateChain(n = 10, difficulty='000') {
    let prevBlock = null;
    let totalTime = 0;

    let chain = _.times(n, () => {
        let block = generateBlock();

        block.header.height = prevBlock ? prevBlock.header.height + 1 : 0;
        block.header.prevHash = prevBlock ? prevBlock.hash : _.repeat("0", 64);

        let start = process.hrtime();
        let attempts = mineBlock(block, difficulty);
        let diff = process.hrtime(start);
        let secElapsed = diff[0] + (diff[1] / 1000000000);
        totalTime += secElapsed;

        let stdoutMsg = sprintf("Block %-3d Hash=%s Prev=%s nonce=%-17d tries=%-8d time=%-0.4fs",
                                block.header.height, block.hash,
                                block.header.prevHash, block.header.nonce,
                                attempts, secElapsed);
        console.log(stdoutMsg);
        prevBlock = block;
        return block;
    })

    console.log(sprintf("Generated %d blocks with an averge block mining time of %0.2fs", n, totalTime / chain.length));

    return chain;
}


let HEIGHT = 100;
let DIFFICULTY = "00000";
let chain = generateChain(HEIGHT, DIFFICULTY);

// ANY tampering with the data will result in the chain being invalidated
// chain[2].header.timestamp = 0xf3cc;
// chain[2].data = 'override';
// chain[2].header.prevHash = '22200ed7b6d7320d6ec4c385cf3ee0d3516b07ad7bcc2b072603911872adb23b';

let valid = verifyChain(chain);
console.log("Chain is...", valid ? "valid" : "invalid");
