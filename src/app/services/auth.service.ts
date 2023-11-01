import { Injectable } from '@angular/core';
import firebase from 'firebase/app';
import { BehaviorSubject, Observable } from 'rxjs';
import { BackendService } from './backend.service';
import { IUser } from '../interface'

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    user: firebase.User
    loggedIn = new BehaviorSubject(false)
    constructor(private backend: BackendService) {
        firebase.auth().onAuthStateChanged((user) => {
            this.user = user
            if (user) {
                this.loggedIn.next(true)
                this.backend.loginUser(this.makeUser(this.user))

            } else {
                this.loggedIn.next(false)
            }
        })
    }
    gprovider = new firebase.auth.GoogleAuthProvider()
    login(): void {
        firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION)
            .then(() => {
                return firebase.auth().signInWithPopup(this.gprovider)
            })
            // .then((result) => {
            //     console.log('login', result)
            // })
    }
    getUser(): firebase.User {
        return this.user
    }
    $loggedin(): Observable<boolean> {
        return this.loggedIn.asObservable()
    }

    // sanitize the user info
    makeUser(u: firebase.User): IUser {
        return {
            displayName: u.displayName,
            uid: u.uid,
            email: u.email,
            photoURL: u.photoURL
        }
    }
}
