import { LightningElement } from 'lwc'
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { createRecord } from 'lightning/uiRecordApi';

export default class CreateCaseWithVideo extends LightningElement {
    vfNotLoaded = false
    videoInProgress = false
    sharedSrc = '';
    videoAvailable = false;
    case = {"Subject":"","Description":""};
    caseId;
    status = '';
    isLoading = false;
    sharedImgSrc = '';
    imageUrl = '';
    imageAvailable = false;
    isVideoSaving = false;
    videoName = '';
    imageName = '';
    case = {};
    isPromptAudio = false;

    connectedCallback() {
        this.vfNotLoaded = true;
        window.addEventListener('message', this.listenForMessage.bind(this))
    }

    listenForMessage(event) {
        if(event.origin.includes('force.com')){
            try{
                console.log(JSON.parse(event.data));
                     this.handleMessage(JSON.parse(event.data))
            }
            catch(error){
                console.log('JSON parsing error',error);
            }
        }else{
            return;
        }
    }

    handleChange(event){
            this.case[event.target.name] = event.detail.value;
    }

    handleDescChange(event){
            this.case.Description = event.target.value;
    }

    handleMessage(message) {
        if (message.type == 'VIDEO_AVAILABLE') {
            this.vfNotLoaded = false;
        }

        if(message.type == 'SCREENSHOT_BEGINS'){
            this.dispatchEvent(new CustomEvent('Minimise', {}));
        }
        if(message.type == 'VIDEO_STARTED'){
            this.isLoading = true;
            this.videoInProgress = true;
       
            this.status = 'Video Recording in Progress..';
            let startRecordingEvt = new CustomEvent('StartRecording', {});
            this.dispatchEvent(startRecordingEvt);
        }
        if (message.type == 'VIDEO_STOPPED' || message.type == 'VIDEO_CANCELLED') {
            this.isLoading = false;
            this.status = '';
            let endRecordingEvt = new CustomEvent('EndRecording', {});
            this.dispatchEvent(endRecordingEvt);
            this.videoInProgress = false;

            if(message.errorStr && message.type == 'VIDEO_CANCELLED'){
                    if(message.errorStr != 'NotAllowedError: Permission denied'){
                                this.showToast(message.errorStr,'Error !','error')
                    }
            }
        }
        if (message.type == 'VIDEO_DATA') {
                this.sharedSrc = message.src;
                this.videoAvailable = true;
        }
        if (message.type == 'FILE_IN_PROGRESS') {
            this.status = 'Please wait while we are uploading the recording...';
        }
        if (message.type == 'FILE_CREATED') {
                if(message.operation == 'screenshot') {
                        this.createVideoFiles(this.caseId);
                }
                else if(message.operation == 'video') {
                    this.isLoading = false;
                    this.dispatchEvent(new CustomEvent('Minimise', {}));
                    this.showToast(`Case is Created and the Video is Uploaded !!`,'Success !','success');
                    this.clearValues();     
                }
        }
        if (message.type == 'FILE_FAILED') {
                this.isLoading = false;
               this.showToast(`Failure in Uploading the recording : ${message.error.errors[0].message}`,'Error !','error');
        }
        if(message.type == 'IMAGE_DATA'){
            
            this.sharedImgSrc = message.src;
            this.imageUrl = message.url;
            this.imageAvailable = true;
            this.dispatchEvent(new CustomEvent('Maximise', {}));
        }
        if (message.type == 'AUDIO_TEXT_STARTED') {
            this.isLoading = true;
            this.status = 'Speech Recognition in Progress. Please continue Speaking ...';

        }
        if (message.type == 'AUDIO_TEXT_STOPPED') {
            this.isLoading = false;
        }
        if (message.type == 'AUDIO_TEXT_RECEIVED') {
                this.template.querySelector('textarea').value += message.msg;
        }
    }

    handleInputFieldChange(event){
        this.case[event.target.fieldName] = event.target.value;
    }

    startScreenShare(message) {
      this.isPromptAudio = true;
    }

    recordWithAudio(event){
        this.sendMessage({ type: 'START_RECORDING' ,isAudio : true });
        this.isPromptAudio = false;
    }

    recordWithOutAudio(event){
        this.sendMessage({ type: 'START_RECORDING' ,isAudio : false });
        this.isPromptAudio = false;
    }

    cancel(event){
        this.isPromptAudio = false;
    }
    

    stopScreenShare(message){
        this.videoInProgress = true
        this.sendMessage({ type: 'STOP_RECORDING' })

    }

    redirectToVideo(event){
        event.preventDefault();
        this.sendMessage({ type: 'VIDEO_PREVIEW' })
    }
    
    sendMessage(data) {
        this.template
            .querySelector('iframe')
            .contentWindow.postMessage(JSON.stringify(data), '*')
    }

    get descriptionCls(){

        if(this.videoAvailable || this.imageAvailable){
                return 'slds-textarea video-available';
        }

        return 'slds-textarea full-view';
    }

    handleSave(){

        this.isLoading = true;
        this.status = 'Please wait while we are creating the Case...';

        const fields = {};
        fields.Subject = this.template.querySelector('lightning-input').value;
        fields.Description = this.template.querySelector('textarea').value;
        const recordInput = {
                apiName: 'Case',
                fields: fields
        };

        createRecord(recordInput).then((record) => {
            this.caseId = record.id;
            if(this.imageAvailable){
                    this.createScreenShot(this.caseId);
            }else{
                this.createVideoFiles(this.caseId);
            }
        }).catch(error => {
            this.isLoading = false;
            var errMsg = '';
            if(error.body && error.body.fieldErrors){
                for(var key of Object.keys(error.body.fieldErrors)){
                        for(var err of error.body.fieldErrors[key]){
                            errMsg += err.message;
                        }
                }
            }
           if(error.body && error.body.pageErrors.length > 0){
                for(var err of error.body.pageErrors){
                    if(!errMsg)
                    errMsg = err.statusCode+':'+err.message;
                    else 
                    errMsg += ' , '+err.statusCode+':'+err.message;
                }
          }  
          
            this.showToast(errMsg,'Error !','error');      
        });
    }

    createScreenShot(recordId){

        if(this.sharedImgSrc){
            this.status = 'Please wait while we are Uploading the Screenshot...';
              this.sendMessage({"operation":"screenshot","type":"CREATE_FILE","name":"Screenshot.Png","recordId":recordId,"src":this.sharedImgSrc});
        }
      

    }

    redirectToImage(event){ 
        this.sendMessage({ "type" : 'IMAGE_PREVIEW' , "url" : this.imageUrl })
    }


    createVideoFiles(recordId){
        this.caseId = recordId;
           if(this.videoAvailable){
                this.isVideoSaving = true;
                this.status = 'Please wait while we are uploading the recording...';
                this.sendMessage({"operation":"video","type":"CREATE_FILE","name":"VideoRecording.webm","recordId":recordId,"src":this.sharedSrc.split(',')[1]});
            }
            else{
                this.status = '';
                this.isLoading = false;
                this.dispatchEvent(new CustomEvent('Minimise', {}));
                this.showToast(`Case is Created`,'Success !','success');
              
                this.clearValues();
            }
    }
               
    clearValues(){
        this.template.querySelector('lightning-input').value = '';
        this.template.querySelector('textarea').value = '';
        for(var item of this.template.querySelectorAll('lightning-input-field')){
            item.value = '';
        }
        this.sharedSrc = '';
        this.videoAvailable = false;
        this.sharedImgSrc = '';
        this.imageUrl = '';
        this.imageAvailable = false;
        this.caseId = '';
        this.case = {"Subject":"","Description":""};
    }

    startScreenShot(event){
   
        this.sendMessage({"type":"START_SCREENSHOT"});
    }

    showToast(message,title,variant) {

        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
            mode: 'dismissable'
        });
        this.dispatchEvent(event);
   }

   addCurrentRecord(event){
        let textValue = this.template.querySelector('textarea').value;
        let msg = '\r\nERROR IN RECORD :'+window.location.href;
        this.template.querySelector('textarea').value = textValue+'\r\n'+msg;
   }

   startSpeaking(event){
        this.sendMessage({"type":"START_SPEAKING"})
   }

   removeImage(event){
         event.stopPropagation();
         this.imageAvailable = false;
         this.sharedImgSrc = '';
   }

   removeVideo(event){
        event.stopPropagation();
        this.videoAvailable = false;
        this.sharedSrc = '';
   }
    
    disconnectedCallback() { }
}