import { Injectable } from '@angular/core';
import PouchDB from 'pouchdb';
import PouchDBAuth from 'pouchdb-authentication';
import PouchDBFind from 'pouchdb-find';
import { throwError, from } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

PouchDB.plugin(PouchDBAuth);
PouchDB.plugin(PouchDBFind);

type RemoteDatabases = 'feedback';

@Injectable()
export class PouchService {
  private baseUrl = environment.couchAddress + '/';
  private localDBs = new Map<RemoteDatabases, PouchDB.Database>();
  private authDB: PouchDB.Database;
  private databases = new Set<RemoteDatabases>([ 'feedback' ]);

  constructor() {
    // test is a placeholder temp databases
    // we need a central remote database
    // since we will have different levels of authentication (manager, intersn)
    // we will have to create corresponding documents in couchdb and we can sync
    // we can decide that when the user is being created for the first time?
    this.authDB = new PouchDB(this.baseUrl + 'test', {
      fetch(url, opts) {
        opts.credentials = 'include';
        return (PouchDB as any).fetch(url, opts);
      }
    } as PouchDB.Configuration.RemoteDatabaseConfiguration);
  }

  configureDBs() {
    this.databases.forEach(db => {
      this.localDBs.set(db, new PouchDB(`local-${db}`));
    });
  }

  deconfigureDBs() {
    return Array.from(this.localDBs.values(), pouchDB => pouchDB.destroy());
  }

  // @TODO: handle edge cases like offline, duplicate, duplications
  // handle repliction errors or make use of navigator online?
  replicateFromRemoteDBs() {
    return Array.from(this.localDBs.entries(), ([ dbName, pouchDB ]) => this.replicateFromRemoteDB(dbName, pouchDB));
  }

  replicateToRemoteDBs() {
    return Array.from(this.localDBs.entries(), ([ dbName, pouchDB ]) => this.replicateToRemoteDB(dbName, pouchDB));
  }

  replicateFromRemoteDB(dbName: RemoteDatabases, pouchDB: PouchDB.Database) {
    return this.replicate(pouchDB.replicate.from(this.baseUrl + dbName));
  }

  replicateToRemoteDB(dbName: RemoteDatabases, pouchDB: PouchDB.Database) {
    return this.replicate(pouchDB.replicate.to(this.baseUrl + dbName));
  }

  replicate(replicateFn) {
    return from(replicateFn).pipe(catchError(this.handleError));
  }

  getLocalPouchDB(db: RemoteDatabases): PouchDB.Database {
    return this.localDBs.get(db);
  }

  getAuthDB(): PouchDB.Database {
    return this.authDB;
  }

  private handleError(err) {
    console.error('An error occurred in PouchDB', err);
    return throwError(err.message || err);
  }
}
