/**
 * Created by michbil on 10.05.16.
 */

import request from 'superagent';
var domain = process.env.DOMAIN;

export function saveToS3(path,html) {
    return new Promise((resolve,reject) => {
        request
            .post(`//storage.${domain}/api/save`)
            .withCredentials()
            .set('Accept', 'application/json')
            .send({
                'url': path,
                'bodyData': html
            })
            .then(({body})=> {
                resolve(body);
            }, (err)=> {
                reject(err);
            });
    });
}

export function getWidgetID(url) {
    return new Promise((resolve,reject) => {
        request
            .get(`//titter.${domain}/obtain_widget_id?query=${url}`)
            .withCredentials()
            .then(result=> {
                resolve(result.text);
            }, (err)=> {
                reject(err);
            });
    });
};

export function getRegistredUser() {
    return new Promise((resolve,reject) => {
        request
            .get(`//login.${domain}/api/get_profile`)
            .withCredentials()
            .then(({body})=> {
                console.log("Get_profile finish", body);
                resolve(body.id);
            }, (err)=> {
                reject(err);
            });
    });
}
