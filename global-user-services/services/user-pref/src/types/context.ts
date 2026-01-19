import exp from 'constants';
import {Db} from 'mongodb';

export interface Context {
    db: Db;
}