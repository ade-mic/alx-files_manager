import dbClient from './utils/db';

const waitConnection = () => {
    return new Promise((resolve, reject) => {
        let i = 0;
        const repeatFct = () => {
            setTimeout(() => {
                i += 1;
                if (i >= 10) {
                    reject(new Error('Unable to connect to MongoDB after 10 attempts'));
                } else if (!dbClient.isAlive()) {
                    repeatFct();
                } else {
                    resolve();
                }
            }, 1000);
        };
        repeatFct();
    });
};

(async () => {
    try {
        console.log('Initial connection status:', dbClient.isAlive());
        await waitConnection();
        console.log('Connection status after waiting:', dbClient.isAlive());
        console.log('Number of users:', await dbClient.nbUsers());
        console.log('Number of files:', await dbClient.nbFiles());
    } catch (err) {
        console.error('Error in main:', err);
    }
})();
