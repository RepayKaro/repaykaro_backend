const axios = require('axios');

module.exports.sendSms = async (eventName, content) => {
    const lowerEvent = eventName.toLowerCase();
    const data = {
        route: "dlt",
        sender_id: "TBMINF",
        schedule_time: "",
        flash: 0,
        numbers: content.numbers,
        variables_values: content.variables_values
    };


    switch (lowerEvent) {
        case "login":
            data.message = "180419";
            break;
        case "send-coupon-link":
            data.message = "180710";
            break;
        default:
            console.log("Invalid event:", lowerEvent);
            return null;
    }

    const requestURL = `https://www.fast2sms.com/dev/bulkV2`;

    try {
        const response = await axios.post(requestURL, data, {
            headers: {
                "Authorization": "fi8sKASyuDnNc7zQC6OpW40grMblU9XVq51a2e3YJjThLGRHoxDKz8SsOThLBiNFRl5p76W1rtQygMaX",
                "Accept": "application/json",
                "Content-Type": "application/json"
            }
        });
        return response.data; // FIXED: Returning `response.data` instead of `response`

    } catch (error) {
        console.error("Error sending SMS:", error.response ? error.response.data : error.message);
        return null;
    }
};
