export default function send(url, data, dataType, callback) {
   $.ajax({
     url: `/resources${url}`,
     type: "POST",

     contentType: "application/json; charset=utf-8",
     dataType: dataType,
     data: JSON.stringify(data),
     success: function(data) {
       if (typeof callback === 'function') callback(data)
     },
     error: function(e, text) {
       if (typeof callback === 'function') callback(null, text)
       console.log(`process error for url ${url}`, text);
     }
   })
 }
