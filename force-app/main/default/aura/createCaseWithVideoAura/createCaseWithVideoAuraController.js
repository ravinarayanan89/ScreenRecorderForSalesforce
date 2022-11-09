({
	startRecording : function(component, event, helper) {

		 var utilityAPI = component.find("utilitybar");
         utilityAPI.setUtilityHighlighted ({ highlighted : true});
          utilityAPI.setUtilityLabel({ 
            label : "Recording in Progress.."
          });
        utilityAPI.minimizeUtility({});
         var utilityAPI = component.find("utilitybar");
        utilityAPI.getUtilityInfo().then(result=>{
           	console.log(JSON.parse(JSON.stringify(result))); 
        });
        
	},
    endRecording : function(component, event, helper) {
         
		 var utilityAPI = component.find("utilitybar");
            utilityAPI.getUtilityInfo().then(result=>{ 
                if(!result.utilityVisible){
                         utilityAPI.openUtility({});
                }
            });
        
         utilityAPI.setUtilityHighlighted ({ highlighted : false});
         utilityAPI.setUtilityLabel({
            label : "Contact Support" 
          });
       
	},
    handleMinimise : function(component,event,helper){

        	 var utilityAPI = component.find("utilitybar");
         	 utilityAPI.minimizeUtility({});
    },
    handleMaximise : function(component,event,helper){

        	 var utilityAPI = component.find("utilitybar");
         	  utilityAPI.openUtility({});
    }
    
})