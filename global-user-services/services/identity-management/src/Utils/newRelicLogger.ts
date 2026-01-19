import axios from 'axios';
import * as configData from "../env"
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
    } catch (error: any) {
        console.error(
            'Error sending log to New Relic:', error);
    }
}