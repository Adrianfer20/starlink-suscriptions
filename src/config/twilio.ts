import { Twilio } from 'twilio';
import env from './env';

const client = new Twilio(env.twilio.accountSid, env.twilio.authToken);

export default client;
