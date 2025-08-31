#!/usr/bin/env node

/**
 * Avail Blockchain Transaction Script (Node.js)
 * 
 * This script demonstrates how to create and send a transaction from one wallet to another
 * on the Avail blockchain using Node.js and Polkadot.js API.
 * 
 * Requirements:
 * - @polkadot/api for blockchain interaction
 * - @polkadot/keyring for wallet management
 * - Valid seed phrase for the sender wallet
 * - Recipient wallet address
 * - Sufficient balance for transaction + fees
 * 
 * Note: This is for educational purposes. Always test on testnet first.
 */

import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady, mnemonicValidate } from '@polkadot/util-crypto';
import { formatBalance } from '@polkadot/util';
import { checkAddress } from '@polkadot/util-crypto';

class AvailTransactionManager {
    constructor(nodeUrl = 'wss://turing-rpc.avail.so/ws') {
        this.nodeUrl = nodeUrl;
        this.api = null;
        this.keyring = null;
    }

    async initialize() {
        try {
            console.log('🔄 Initializing crypto libraries...');
            await cryptoWaitReady();
            
            console.log(`🔄 Connecting to Avail network: ${this.nodeUrl}`);
            const provider = new WsProvider(this.nodeUrl);
            this.api = await ApiPromise.create({ provider });
            
            // Initialize keyring with sr25519 crypto type
            this.keyring = new Keyring({ type: 'sr25519', ss58Format: 42 });
            
            const chain = await this.api.rpc.system.chain();
            const version = await this.api.rpc.system.version();
            
            console.log(`✅ Connected to ${chain} (${version})`);
            
            // Set up balance formatting
            const chainDecimals = this.api.registry.chainDecimals[0] || 18;
            const chainToken = this.api.registry.chainTokens[0] || 'AVAIL';
            formatBalance.setDefaults({
                decimals: chainDecimals,
                unit: chainToken
            });
            
            return true;
        } catch (error) {
            console.error(`❌ Failed to initialize: ${error.message}`);
            throw error;
        }
    }

    createKeypairFromSeed(seedPhrase) {
        try {
            // Validate mnemonic
            if (!mnemonicValidate(seedPhrase)) {
                throw new Error('Invalid seed phrase');
            }
            
            const keypair = this.keyring.addFromMnemonic(seedPhrase);
            console.log(`✅ Keypair created for address: ${keypair.address}`);
            return keypair;
        } catch (error) {
            console.error(`❌ Failed to create keypair: ${error.message}`);
            throw error;
        }
    }

    async getBalance(address) {
        try {
            // Validate address format
            try {
                checkAddress(address, 42); // 42 is Avail's SS58 format
            } catch (error) {
                throw new Error(`Invalid address format: ${error.message}`);
            }
            
            const { data: balance } = await this.api.query.system.account(address);
            const freeBalance = balance.free.toString();
            const formattedBalance = formatBalance(freeBalance, { withSi: false, forceUnit: '-' });
            
            console.log(`💰 Balance for ${address}: ${formattedBalance} AVAIL`);
            return balance.free;
        } catch (error) {
            console.error(`❌ Failed to get balance: ${error.message}`);
            return 0;
        }
    }

    async estimateFee(senderKeypair, recipientAddress, amount) {
        try {
            // Create the transfer call
            const transfer = this.api.tx.balances.transferKeepAlive(recipientAddress, amount);
            
            // Get payment info
            const paymentInfo = await transfer.paymentInfo(senderKeypair);
            const fee = paymentInfo.partialFee.toString();
            const formattedFee = formatBalance(fee, { withSi: false, forceUnit: '-' });
            
            console.log(`💸 Estimated fee: ${formattedFee} AVAIL`);
            return paymentInfo.partialFee;
        } catch (error) {
            console.error(`❌ Failed to estimate fee: ${error.message}`);
            return 0;
        }
    }

    async sendTransaction(senderSeed, recipientAddress, amountAvail) {
        try {
            // Create sender keypair
            const senderKeypair = this.createKeypairFromSeed(senderSeed);
            
            // Convert AVAIL to smallest unit (planck)
            const chainDecimals = this.api.registry.chainDecimals[0] || 18;
            const amount = this.api.createType('Balance', amountAvail * Math.pow(10, chainDecimals));
            
            // Validate recipient address
            try {
                checkAddress(recipientAddress, 42); // 42 is Avail's SS58 format
            } catch (error) {
                throw new Error(`Invalid recipient address format: ${error.message}`);
            }
            
            // Check sender balance
            const senderBalance = await this.getBalance(senderKeypair.address);
            
            // Estimate transaction fee
            const estimatedFee = await this.estimateFee(senderKeypair, recipientAddress, amount);
            
            // Check if sender has sufficient balance
            const totalNeeded = amount.add(estimatedFee);
            if (senderBalance.lt(totalNeeded)) {
                const neededFormatted = formatBalance(totalNeeded, { withSi: false, forceUnit: '-' });
                const availableFormatted = formatBalance(senderBalance, { withSi: false, forceUnit: '-' });
                throw new Error(
                    `Insufficient balance. Need ${neededFormatted} AVAIL, but only have ${availableFormatted} AVAIL`
                );
            }
            
            console.log(`🚀 Sending ${amountAvail} AVAIL from ${senderKeypair.address} to ${recipientAddress}`);
            
            // Create and submit transaction
            const transfer = this.api.tx.balances.transferKeepAlive(recipientAddress, amount);
            
            return new Promise((resolve, reject) => {
                transfer.signAndSend(senderKeypair, ({ status, events, dispatchError }) => {
                    if (status.isInBlock) {
                        console.log(`📦 Transaction included in block: ${status.asInBlock}`);
                    } else if (status.isFinalized) {
                        console.log(`✅ Transaction finalized in block: ${status.asFinalized}`);
                        
                        // Check for errors
                        if (dispatchError) {
                            if (dispatchError.isModule) {
                                const decoded = this.api.registry.findMetaError(dispatchError.asModule);
                                const { docs, name, section } = decoded;
                                console.error(`❌ Transaction failed: ${section}.${name}: ${docs.join(' ')}`);
                                reject(new Error(`${section}.${name}: ${docs.join(' ')}`));
                            } else {
                                console.error(`❌ Transaction failed: ${dispatchError.toString()}`);
                                reject(new Error(dispatchError.toString()));
                            }
                        } else {
                            // Success
                            const txHash = transfer.hash.toHex();
                            console.log(`📋 Transaction hash: ${txHash}`);
                            console.log(`🔗 Block hash: ${status.asFinalized}`);
                            
                            resolve({
                                success: true,
                                txHash: txHash,
                                blockHash: status.asFinalized.toHex(),
                                amount: amountAvail,
                                fee: formatBalance(estimatedFee, { withSi: false, forceUnit: '-' })
                            });
                        }
                    } else if (status.isDropped || status.isInvalid || status.isUsurped) {
                        console.error(`❌ Transaction failed with status: ${status.type}`);
                        reject(new Error(`Transaction failed with status: ${status.type}`));
                    }
                }).catch(error => {
                    console.error(`❌ Transaction submission error: ${error.message}`);
                    reject(error);
                });
            });
            
        } catch (error) {
            console.error(`❌ Transaction error: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async disconnect() {
        if (this.api) {
            await this.api.disconnect();
            console.log('🔌 Disconnected from network');
        }
    }
}

async function main() {
    // Configuration - UPDATE THESE VALUES
    const SENDER_SEED = "your twelve word seed phrase goes here for sender wallet";
    const RECIPIENT_ADDRESS = "5HpG9w8EBLe5XCrbczpwq5TSXvedjrBGCwqxK1iQ7qUsSWFc"; // Example address
    const AMOUNT_TO_SEND = 1.0; // Amount in AVAIL tokens
    
    const txManager = new AvailTransactionManager();
    
    try {
        // Initialize connection
        await txManager.initialize();
        
        // Send transaction
        const result = await txManager.sendTransaction(
            SENDER_SEED,
            RECIPIENT_ADDRESS,
            AMOUNT_TO_SEND
        );
        
        // Print result
        console.log('\n' + '='.repeat(50));
        console.log('TRANSACTION RESULT:');
        console.log(JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.error(`❌ Script error: ${error.message}`);
    } finally {
        // Clean up
        await txManager.disconnect();
    }
}

// Entry point - check if this file is being run directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if this file is the main module
if (process.argv[1] === __filename) {
    console.log('🌟 Avail Blockchain Transaction Script (Node.js)');
    console.log('='.repeat(50));
    
    // Warning message
    console.log('⚠️  WARNING: This script handles real cryptocurrency transactions!');
    console.log('⚠️  Always test on testnet first!');
    console.log('⚠️  Double-check all addresses and amounts!');
    console.log('='.repeat(50));
    
    // Uncomment the line below to run the transaction
    // main();
    
    console.log('\n📝 To use this script:');
    console.log('1. Install dependencies: npm install');
    console.log('2. Update SENDER_SEED with your actual seed phrase');
    console.log('3. Update RECIPIENT_ADDRESS with the destination address');
    console.log('4. Update AMOUNT_TO_SEND with the amount you want to send');
    console.log('5. Uncomment the main() call at the bottom');
    console.log('6. Run: node avail-transaction.js');
}

export { AvailTransactionManager };