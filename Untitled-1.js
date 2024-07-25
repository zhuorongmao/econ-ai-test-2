// this question will drop a JSON version of the conversation into this embedded data location
const EMBEDDED_DATA_DEST = "convo_history";

// adjust as needed
const OPENAI_API_KEY = "Bearer sk-proj-9RCIjzlWhJt13yRhbYquT3BlbkFJEHnD7BOfkdWMivLtf7Vr";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = 'gpt-4o';

// after this many turns, the conversation will be disabled and the respondent will be able to advance to the next question
const MAX_TURNS = 6;

//
// ----------------------------------------------------------------
//

// these are all used to construct the initial set of messages

const GPT4_SYS_PROMPT = `You are an expert in helping individuals cultivate gratitude in their lives. You are acting as a therapist. Your goal is help the user feel more grateful in life. You have been trained in the latest academic literature about gratitude. You know that when asked what they are grateful for, most people will respond with a list of things. However, you also know that when people reflect on relationships the benefits are much greater. Therefore, you must guide the user to reflect on relationships that are important, that have shaped them, and that have shaped how they treat others.

You have three specific goals:

First, you must get them to identify a benevolent relationship that has had meaningful impact on their live. Ideally, this relationship would involve some sort of sacrifice on the part of the giver.

Second, you must get them to reflect their feelings about that relationship and its impact.

Third, you must get them to express how this relationship will change their behavior. In other words, how will this relationship drive some sort of outward expression? How will they "pay it forward"?`;
const GPT4_INITIAL_TURN = "Hello! Thank you for meeting with me today. Could we start by having you tell me a bit about yourself?"
const GPT4_SECOND_TURN = "Perfect. Now, can you please list three things that you are grateful for?"

// grabbing some data from another question
const user_demographics = "${e://Field/description}";

//
// ----------------------------------------------------------------
//

// the initial converation

var messages = [{role: 'system', content: GPT4_SYS_PROMPT},
        {role: 'assistant', content: GPT4_INITIAL_TURN},
                {role: 'user', content: user_demographics},
                {role: 'assistant', content: GPT4_SECOND_TURN}
           ];
Qualtrics.SurveyEngine.setEmbeddedData( EMBEDDED_DATA_DEST , JSON.stringify( messages ) );

//
// ----------------------------------------------------------------
// ----------------------------------------------------------------
// ----------------------------------------------------------------
//

// store this reference for future use
const question_this = this;

var initial_messages_length = messages.length;  // check this later

this.disableNextButton();

// I had no luck hiding the "done" button, so I'm just deleting it
jQuery(".advanceButtonContainer").empty();

// create my own button
jQuery("<div style='display:inline-block;padding:20 20 20 20;'><input type='button' value='Submit response' class='AdvanceButton Button' id='submitButton' disabled /></div>").appendTo( jQuery(".QuestionOuter") );
jQuery("#submitButton").prop("disabled",false);

jQuery("#submitButton").click( function() {

    /*
Things that should happen when they click the button:

1) Check that their input was not empty
2) Disable the submit button
3) Construct the new set of messages
4) Update the global conversation structure
5) Store a json version of the GCS
6) Ping the GPT API
7) Once we have a response, clear the question text and replace it by the GPT respone
8) clear the input text area
9) re-enable the submit button
10) check to see if it's time for the convo to end / enable the "next" button
*/

    var current_user_response = jQuery(".InputText").val();

    if ( ( current_user_response == undefined) || ( current_user_response.length == 0 ) ) {
    alert("Please enter a response");
    return;
    }

    jQuery("#submitButton").prop("disabled",true);

    messages.push( {
    role: 'user',
    content: current_user_response,
    });
    Qualtrics.SurveyEngine.setEmbeddedData( EMBEDDED_DATA_DEST , JSON.stringify( messages ) );

    const data = {
        model: OPENAI_MODEL,
        messages: messages,
        max_tokens: 1000,
        temperature: 1.0,
    };

    console.log( "initiating gpt query..." );
    console.log( messages );

    fetch( OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': OPENAI_API_KEY
    },
    body: JSON.stringify(data)
    })
    .then(response => {
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return response.json();
    })
    .then(data => {

    //
    // GOT A RESPONSE!
    //

    console.log('API Response:', data);

    message = data.choices[0].message.content;
    console.log("Message: ", message);

    $$('.QuestionText')[0].innerText = message;

    messages.push( {
        role: 'assistant',
        content: message
    });
    Qualtrics.SurveyEngine.setEmbeddedData( EMBEDDED_DATA_DEST , JSON.stringify( messages ) );

    jQuery(".InputText").val( '' ); // reset answer field for next question
    jQuery("#submitButton").prop("disabled",false);

    // CHECK TO SEE IF THE CONVO HAS ENDED
    if (( messages.length - initial_messages_length ) / 2 >= MAX_TURNS) {

        question_this.enableNextButton();
        jQuery("#submitButton").prop("disabled",true);
        jQuery(".InputText").val( '' );
        $$('.QuestionText')[0].innerText = "Thank you for your answers. Please click the 'Next' button below";

    }

    })
    .catch(error => {
    console.error('There was a problem with the fetch operation:', error);

    Qualtrics.SurveyEngine.setEmbeddedData("API Error" , "true");

    question_this.enableNextButton();
    });

});