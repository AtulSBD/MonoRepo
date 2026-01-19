
import axios from 'axios';
import * as configData from './src/env';
export async function sendLogToNewRelic(logs: any): Promise<void> {

    try {
        const response = await axios.post(
            `${configData.newRelicLogApiUrl}`,
            
            logs,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-License-Key': `${configData.newRelicLogApiKey}`,  
                },
            }
        );
        console.log('Log has been sent successfully to New Relic.', response.data);
    } catch (error: any) {
        console.error(
            'Error sending log to New Relic:',
            error.response?.data || error.message
        );
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', error.response.data); 
        }
    }
}