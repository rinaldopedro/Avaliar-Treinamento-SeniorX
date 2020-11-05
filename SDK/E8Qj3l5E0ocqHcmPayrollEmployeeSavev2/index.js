/**
 * Nome da primitiva : employeeSave
 * Nome do dominio : hcm
 * Nome do serviço : payroll
 * Nome do tenant : trn00307038
 * Objetivo: Avaliação do Treinamento - SDK
 * Autor: Rinaldo Pedro
*/

// Adiciona o Axios para acesso aos dados persistidos no banco
const axios = require('axios');

exports.handler = async event => {
  
   // Definição das variaveis de uso comum
   let body = parseBody(event);
   let tokenSeniorX = event.headers['X-Senior-Token'];
   let URL = '';
   
   // chamando o axios 
   const instance = axios.create({
         baseURL: 'https://platform-homologx.senior.com.br/t/senior.com.br/bridge/1.0/rest/',
         headers: {
             'Authorization': tokenSeniorX
         }
   });    


    /****************************************************************************************************************************************************** 
     *                                                                                                                                                    *
     *  INICIO DOS TESTES DE VALIDAÇÃO - AVALIAÇÃO 1                                                                                                      *
     *                                                                                                                                                    *
     ******************************************************************************************************************************************************/
    
    // 1º - Validar obrigatoriedade do campo "Matrícula ###################################################################################################
    if (!body.sheetContract.registernumber) {
       // Se o campo Matrícula não foi preenchido, avisa o usuário
       return sendRes(400,'Atenção: A matrícula precisa ser informada. Verifique!'); 
    }    
    
    
    // 2º Não permitir realizar uma Admissão com o campo "Indicativo de Admissão" com o valor diferente de "Normal ########################################
    if (body.sheetContract.admissionOriginType) {
      let campoTipoAdmissao = Object.entries(body.sheetContract.admissionOriginType);
      let textoTipoAdmissao;
      
      // Traz o texto do tipo de admissão para comparação
      for (var [key, value] of campoTipoAdmissao) {
          textoTipoAdmissao = value; 
         }      
      
      if (textoTipoAdmissao !== 'Normal') {
         return sendRes(400,'O Indicativo da Admissão deve ser do tipo "Normal" e não do tipo "'+textoTipoAdmissao+'". Por favor, corrija!');
      } 
    } else {
            // Verifica a Categoria do eSocial, pois o controle doIndicativo só pode ser feito para categorias abaixo de 200
            let campoCategEsocial = Object.entries(body.sheetContract.categoryESocial);
            let textoCategEsocial;
            let numeroCategEsocial;
                
            // Traz o texto do tipo de admissão para comparação
            for (var [key, value] of campoCategEsocial) {
                 textoCategEsocial = value; 
            }   
           
            // Trazendo só o inicial que indicado o código da Categoria
            textoCategEsocial = textoCategEsocial.substring(0, 3);
            
            // Convertendo para numero para fazer as comparações
            numeroCategEsocial = parseInt( textoCategEsocial,10);
                
            // Se o campo Indicação de Admissão não foi preenchido, avisa o usuário
            if (numeroCategEsocial < 200) {
                return sendRes(400,'Atenção: O Indicativo da Admissão (aba Contrato)  precisa ser informado. Verifique!');   
           }      
    }    
    
    
    // 3º Em uma alteração de colaborador (Colaborador já cadastrado), implementar uma validação que impeça o usuário de alterar o nome do Colaborador ####
    if(body.sheetInitial.employee) {
       if (body.sheetInitial.employee.name  !== body.sheetInitial.person.name) {
           return sendRes(400,'Não é permitido alterar o Nome do Colaborador!');  
       }
    } 

    // 4º Para os colaboradores com tipo de contrato "1 - Empregado". A Escala deve estar no range de  1 a 10 e ser do tipo permanente ####################
    if ((body.sheetInitial.contractType.key === 'Employee') && (body.sheetWorkSchedule.workshift.tableId)) {
        try {
             let codigoEscalaRes = await instance.get(`/hcm/payroll/entities/workshift/${body.sheetWorkSchedule.workshift.tableId}`);
             
             // Extrai o codigo da escala do retorno da pesquisa
             let codigoEscala = codigoEscalaRes.data.code;
             
             if (codigoEscala > 10) {
                return sendRes(400,'Range de escala não permitido para Empregados! Precisa estar entre 1 e 10. Verifique|');
             }
             else {
                   // Monta a URL que irá buscar no WS G5 e recebe o retorno se a escala é do tipo Permanente
                   URL =  'http://ec2-3-236-181-162.compute-1.amazonaws.com:8080/SXI/G5Rest?module=rubi&service=com.senior.g5.rh.fp.escala&port=consulta&codEsc='+`${codigoEscala}`;
 
                   // Busca a resposta do WS
                   let responseTipoEscala = await axios.get(URL).then(req => {return req.data}).catch(err => console.log(err));
                   
                   // Caso a resposta seja diferente de "P" na G5 avisa o usuário
                   if (responseTipoEscala.tipEsc !== 'P') {
                       return sendRes(400,'A escala ('+body.sheetWorkSchedule.workshift.name+') não é do tipo Permanente na G5. Por favor escolha outra escala!'); 
                   }                  
             }            

        } 
        catch (error) {
               return sendRes(400,error.message);
        }
    }

    

    /****************************************************************************************************************************************************** 
     *                                                                                                                                                    *
     *  INICIO DOS TESTES DE VALIDAÇÃO - AVALIAÇÃO 2 - LIVRE ESCOLHA - SOMENTE PERMITIR SALVAR SE A CNH ESTIVER PREENCHIDA (QUANDO O CARGO REQUERER)      *
     *                                                                                                                                                    *
     *  Para o teste foram construídos:                                                                                                                   *
     *  -------------------------------                                                                                                                   *
     *  1) Webservice na G5 para buscar as informações do cargo (envio 2 parametros e devolvo 1 parametro)                                                *
     *  2) Função na G7 para receber/tratar o retorno do WS, e definir se libera ou impede a gravação do registro.                                        *
     *                                                                                                                                                    *
     *  Nota: Só irá liberar a gravação se:                                                                                                               *
     *  -----------------------------------                                                                                                               *
     *  1) O cargo na G5 estiver com o campo CnhObr em branco ou igual a 'N'                                                                              *
     *  2) O cargo na G5 estiver com o campo CnhObr igual a 'S' e o campo CNH da guia Documentos estiver preenchido com algum número diferente de zero    *
     *  3) Para facilitar o teste, o WS foi criado sem autenticação, mas sei passar as mesmas... Fiz assim para evitar os erros de sincronia que vimos    * 
     *     durante os treinamentos                                                                                                                        *
     *                                                                                                                                                    *
     ******************************************************************************************************************************************************/

    // Buscar o código da Empresa para enviar como parametro para o WS que buscará o campo de CNH do Cargo 
    if (body.sheetPlace.jobPosition) {
       // Pega a empresa (para buscar o estcar)
       let codigoEmpresa = Object.entries(body.sheetInitial.company);
       
       // Traz o texto da Empresa para separação do codigo e titulo
       for (var [key, value] of codigoEmpresa) {
          codigoEmpresa = value; 
         }     
         
       // Separa o codigo do nome da empresa
       codigoEmpresa = codigoEmpresa.split('-')[0].trim();          
       
       // Pega o cargo (para pegar o codigo)
       let codigoCargo = Object.entries(body.sheetPlace.jobPosition);

       // Traz o texto do tipo de contrato para comparação
       for (var [key, value] of codigoCargo) {
          codigoCargo = value; 
         } 

       // Separa o codigo do titulo do cargo
       codigoCargo = codigoCargo.split('-')[0].trim(); 
       
       // Monta a URL que irá buscar no WS G5 e recebe o retorno se o cargo precisa ter CNH
       URL =  `http://ec2-3-236-181-162.compute-1.amazonaws.com:8080/SXI/G5Rest?module=rubi&service=com.senior.g5.rh.fp.CnhCargo&port=verifica&codEmp=${codigoEmpresa}&codCar=${codigoCargo}`;

       // Busca a resposta do WS
       let responseCNHCargo = await axios.get(URL).then(req => {return req.data}).catch(err => console.log(err));
       
       // Caso a resposta seja "S" e o campo da CNH estiver em branco, avisa o usuário
       if (responseCNHCargo.cnhObr === 'S') {
           if (body.sheetDocument.cnh) {
               let numCNH = body.sheetDocument.cnh;
                   numCNH = parseInt(numCNH,10);
               if (numCNH <= 0) {
                   return sendRes(400,'O cargo deste Colaborador exige que o mesmo tenha uma CNH, e seu número está inválido. Verifique!');
               }       
           }
           else {
                 return sendRes(400,'O cargo deste Colaborador exige que o mesmo tenha uma CNH. Verifique!');
           }
       }
    }    
   
    /****************************************************************************************************************************************************** 
     *                                                                                                                                                    *
     *  FIM DOS TESTES DE VALIDAÇÃO                                                                                                                       *
     *                                                                                                                                                    *
     ******************************************************************************************************************************************************/

    // Caso ok devolve body sem mensagens 
    return sendRes(200,body);
};


// Realiza o parse do body recebido
const parseBody = (event) => {
  return typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
};

// Função de retorno para o ambiente G7
const sendRes = (status, body) => {

  var response = {
    statusCode: status,
    headers: {
      "Content-Type": "application/json"
    },
    body: typeof body === 'string' ? body : JSON.stringify(body) 
  };

  return response;
};