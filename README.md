# Avail Blockchain Transaction Script (Node.js)

A Node.js script for sending AVAIL tokens between wallets on the Avail blockchain.

## Features

- Connect to Avail mainnet or testnet
- Create keypairs from seed phrases
- Check wallet balances
- Estimate transaction fees
- Send AVAIL tokens between addresses
- Comprehensive error handling and logging

## Installation

1. Install Node.js dependencies:
```bash
npm install
```

## Usage

1. Open `avail-transaction.js`
2. Update the configuration variables:
   - `SENDER_SEED`: Your 12 or 24 word seed phrase
   - `RECIPIENT_ADDRESS`: Destination wallet address
   - `AMOUNT_TO_SEND`: Amount in AVAIL tokens to send

3. Uncomment the `main()` call at the bottom of the file

4. Run the script:
```bash
node avail-transaction.js
```

## Safety Notes

⚠️ **IMPORTANT SECURITY CONSIDERATIONS:**

- **Never share your seed phrases** - Keep them secure and private
- **Test on testnet first** - Always test with small amounts on testnet
- **Double-check addresses** - Verify recipient addresses are correct
- **Backup your wallets** - Ensure you have secure backups
- **Use at your own risk** - This script handles real cryptocurrency

## Configuration

The script connects to Avail Turing testnet by default. To use mainnet, change the node URL:

```javascript
const txManager = new AvailTransactionManager("wss://mainnet.avail.tools/ws");
```

## Error Handling

The script includes comprehensive error handling for:
- Network connection issues
- Invalid seed phrases
- Insufficient balances
- Transaction failures
- Fee estimation errors

## Example Output

```
🌟 Avail Blockchain Transaction Script (Node.js)
==================================================
🔄 Initializing crypto libraries...
🔄 Connecting to Avail network: wss://turing-rpc.avail.so/ws
✅ Connected to Avail Turing (1.11.0-99b85257d6b)
✅ Keypair created for address: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
💰 Balance for 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY: 10.5000 AVAIL
💸 Estimated fee: 156.2500 µAVAIL
🚀 Sending 1.0 AVAIL from 5GrwvaEF... to 5HpG9w8EBLe5XCrbczpwq5TSXvedjrBGCwqxK1iQ7qUsSWFc
📦 Transaction included in block: 0x1234567890abcdef...
✅ Transaction successful!
📋 Transaction hash: 0x1234567890abcdef...
🔗 Block hash: 0xabcdef1234567890...
```