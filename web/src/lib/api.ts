import axios from 'axios';
import { MICROSERVICE_BASE_URL } from './config';

export const api = axios.create({
    baseURL: MICROSERVICE_BASE_URL
});