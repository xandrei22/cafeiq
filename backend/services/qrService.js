const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

class QRService {
    constructor() {
        this.baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    }

    async generateTableQR(tableNumber) {
        try {
            const tableData = {
                tableNumber: tableNumber,
                timestamp: new Date().toISOString(),
                qrId: uuidv4()
            };

            const tableUrl = `${this.baseUrl}/customer/menu?table=${tableNumber}&data=${encodeURIComponent(JSON.stringify(tableData))}`;

            const qrCodeDataURL = await QRCode.toDataURL(tableUrl, {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                quality: 0.92,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            return {
                qrCode: qrCodeDataURL,
                url: tableUrl,
                type: 'table',
                tableNumber: tableNumber,
                data: tableData
            };
        } catch (error) {
            console.error('Error generating table QR code:', error);
            throw error;
        }
    }

    async generatePaymentQR(orderId, amount, paymentMethod = 'gcash', tableNumber = null) {
        try {
            const paymentData = {
                orderId: orderId,
                amount: amount,
                method: paymentMethod,
                tableNumber: tableNumber,
                timestamp: new Date().toISOString(),
                qrId: uuidv4()
            };

            const paymentUrl = `${this.baseUrl}/payment?data=${encodeURIComponent(JSON.stringify(paymentData))}`;

            const qrCodeDataURL = await QRCode.toDataURL(paymentUrl, {
                errorCorrectionLevel: 'H',
                type: 'image/png',
                quality: 0.92,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            return {
                qrCode: qrCodeDataURL,
                url: paymentUrl,
                data: paymentData,
                type: 'payment',
                orderId: orderId,
                tableNumber: tableNumber
            };
        } catch (error) {
            console.error('Error generating payment QR code:', error);
            throw error;
        }
    }

    async generateOrderTrackingQR(orderId, tableNumber = null) {
        try {
            const trackingUrl = tableNumber ?
                `${this.baseUrl}/order-status/${orderId}?table=${tableNumber}` :
                `${this.baseUrl}/order-status/${orderId}`;

            const qrCodeDataURL = await QRCode.toDataURL(trackingUrl, {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                quality: 0.92,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            return {
                qrCode: qrCodeDataURL,
                url: trackingUrl,
                type: 'tracking',
                orderId: orderId,
                tableNumber: tableNumber
            };
        } catch (error) {
            console.error('Error generating tracking QR code:', error);
            throw error;
        }
    }

    async generateLoyaltyQR(customerId) {
        try {
            const loyaltyUrl = `${this.baseUrl}/loyalty/${customerId}`;

            const qrCodeDataURL = await QRCode.toDataURL(loyaltyUrl, {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                quality: 0.92,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            return {
                qrCode: qrCodeDataURL,
                url: loyaltyUrl,
                type: 'loyalty',
                customerId: customerId
            };
        } catch (error) {
            console.error('Error generating loyalty QR code:', error);
            throw error;
        }
    }

    async generateEventBookingQR(eventId) {
        try {
            const eventUrl = `${this.baseUrl}/event-booking/${eventId}`;

            const qrCodeDataURL = await QRCode.toDataURL(eventUrl, {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                quality: 0.92,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            return {
                qrCode: qrCodeDataURL,
                url: eventUrl,
                type: 'event',
                eventId: eventId
            };
        } catch (error) {
            console.error('Error generating event QR code:', error);
            throw error;
        }
    }

    async generateStaffLoginQR() {
        try {
            const loginUrl = `${this.baseUrl}/staff/login`;

            const qrCodeDataURL = await QRCode.toDataURL(loginUrl, {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                quality: 0.92,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            return {
                qrCode: qrCodeDataURL,
                url: loginUrl,
                type: 'staff_login'
            };
        } catch (error) {
            console.error('Error generating staff login QR code:', error);
            throw error;
        }
    }

    async generateBulkTableQRs(tableCount) {
        try {
            const qrCodes = [];

            for (let i = 1; i <= tableCount; i++) {
                const qr = await this.generateTableQR(i);
                qrCodes.push(qr);
            }

            return qrCodes;
        } catch (error) {
            console.error('Error generating bulk table QR codes:', error);
            throw error;
        }
    }

    parseQRData(qrData) {
        try {
            // Try to parse as JSON first
            if (qrData.startsWith('{')) {
                return JSON.parse(qrData);
            }

            // Try to parse URL parameters
            const url = new URL(qrData);
            const dataParam = url.searchParams.get('data');
            const tableParam = url.searchParams.get('table');

            if (dataParam) {
                const parsedData = JSON.parse(decodeURIComponent(dataParam));
                if (tableParam) {
                    parsedData.tableNumber = tableParam;
                }
                return parsedData;
            }

            // Return URL path info
            return {
                path: url.pathname,
                params: Object.fromEntries(url.searchParams),
                tableNumber: tableParam
            };
        } catch (error) {
            console.error('Error parsing QR data:', error);
            return { raw: qrData };
        }
    }

    // Helper method to extract table number from QR data
    extractTableNumber(qrData) {
        try {
            const parsed = this.parseQRData(qrData);
            return parsed.tableNumber || (parsed.data && parsed.data.tableNumber) || null;
        } catch (error) {
            console.error('Error extracting table number:', error);
            return null;
        }
    }
}

module.exports = new QRService();